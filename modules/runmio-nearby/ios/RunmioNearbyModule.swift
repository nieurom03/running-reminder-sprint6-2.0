import ExpoModulesCore
import Foundation
import MultipeerConnectivity

private let nearbyServiceType = "runmio-group"

private struct PendingInvitation {
  let peer: MCPeerID
  let handler: (Bool, MCSession?) -> Void
}

private final class NearbyManager: NSObject,
  MCNearbyServiceAdvertiserDelegate,
  MCNearbyServiceBrowserDelegate,
  MCSessionDelegate
{
  private let emit: (String, [String: Any]) -> Void
  private var localPeer: MCPeerID?
  private var session: MCSession?
  private var advertiser: MCNearbyServiceAdvertiser?
  private var browser: MCNearbyServiceBrowser?
  private var discoveredPeers: [String: MCPeerID] = [:]
  private var pendingInvitations: [String: PendingInvitation] = [:]

  init(emit: @escaping (String, [String: Any]) -> Void) {
    self.emit = emit
    super.init()
  }

  private func normalizedPeerName(_ value: String) -> String {
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    var result = ""
    for character in trimmed {
      let candidate = result + String(character)
      if candidate.utf8.count > 48 { break }
      result = candidate
    }
    return result.isEmpty ? "Runner" : result
  }

  func start(displayName: String) {
    stop()

    let peer = MCPeerID(displayName: normalizedPeerName(displayName))
    let nextSession = MCSession(
      peer: peer,
      securityIdentity: nil,
      encryptionPreference: .required
    )
    let nextAdvertiser = MCNearbyServiceAdvertiser(
      peer: peer,
      discoveryInfo: nil,
      serviceType: nearbyServiceType
    )
    let nextBrowser = MCNearbyServiceBrowser(
      peer: peer,
      serviceType: nearbyServiceType
    )

    nextSession.delegate = self
    nextAdvertiser.delegate = self
    nextBrowser.delegate = self

    localPeer = peer
    session = nextSession
    advertiser = nextAdvertiser
    browser = nextBrowser

    nextAdvertiser.startAdvertisingPeer()
    nextBrowser.startBrowsingForPeers()
  }

  func stop() {
    advertiser?.stopAdvertisingPeer()
    browser?.stopBrowsingForPeers()
    session?.disconnect()
    pendingInvitations.values.forEach { invitation in
      invitation.handler(false, nil)
    }

    pendingInvitations.removeAll()
    discoveredPeers.removeAll()
    advertiser = nil
    browser = nil
    session = nil
    localPeer = nil
    emit("onPeersChanged", ["peers": [[String: String]]()])
  }

  func invite(peerId: String, context: String) -> Bool {
    guard
      let peer = discoveredPeers[peerId],
      let browser,
      let session
    else {
      return false
    }

    browser.invitePeer(
      peer,
      to: session,
      withContext: context.data(using: .utf8),
      timeout: 30
    )
    return true
  }

  func respondToInvitation(token: String, accept: Bool) -> Bool {
    guard let invitation = pendingInvitations.removeValue(forKey: token) else {
      return false
    }
    invitation.handler(accept, accept ? session : nil)
    return true
  }

  func send(payload: String, peerNames: [String]) throws -> Int {
    guard let session, let data = payload.data(using: .utf8) else { return 0 }
    let requestedNames = Set(peerNames)
    let peers = session.connectedPeers.filter {
      requestedNames.contains($0.displayName)
    }
    guard !peers.isEmpty else { return 0 }
    try session.send(data, toPeers: peers, with: .reliable)
    return peers.count
  }

  func connectedPeerNames() -> [String] {
    session?.connectedPeers.map(\.displayName).sorted() ?? []
  }

  private func emitDiscoveredPeers() {
    let peers = discoveredPeers
      .map { id, peer in ["id": id, "name": peer.displayName] }
      .sorted { ($0["name"] ?? "") < ($1["name"] ?? "") }
    emit("onPeersChanged", ["peers": peers])
  }

  func browser(
    _ browser: MCNearbyServiceBrowser,
    foundPeer peerID: MCPeerID,
    withDiscoveryInfo info: [String: String]?
  ) {
    guard !discoveredPeers.values.contains(where: { $0 == peerID }) else {
      return
    }
    discoveredPeers[UUID().uuidString] = peerID
    emitDiscoveredPeers()
  }

  func browser(_ browser: MCNearbyServiceBrowser, lostPeer peerID: MCPeerID) {
    discoveredPeers = discoveredPeers.filter { $0.value != peerID }
    emitDiscoveredPeers()
  }

  func browser(
    _ browser: MCNearbyServiceBrowser,
    didNotStartBrowsingForPeers error: Error
  ) {
    emit("onError", ["message": error.localizedDescription])
  }

  func advertiser(
    _ advertiser: MCNearbyServiceAdvertiser,
    didReceiveInvitationFromPeer peerID: MCPeerID,
    withContext context: Data?,
    invitationHandler: @escaping (Bool, MCSession?) -> Void
  ) {
    let token = UUID().uuidString
    pendingInvitations[token] = PendingInvitation(
      peer: peerID,
      handler: invitationHandler
    )
    emit("onInvitation", [
      "token": token,
      "peerName": peerID.displayName,
      "context": context.flatMap { String(data: $0, encoding: .utf8) } ?? ""
    ])
  }

  func advertiser(
    _ advertiser: MCNearbyServiceAdvertiser,
    didNotStartAdvertisingPeer error: Error
  ) {
    emit("onError", ["message": error.localizedDescription])
  }

  func session(
    _ session: MCSession,
    peer peerID: MCPeerID,
    didChange state: MCSessionState
  ) {
    let stateName: String
    switch state {
    case .connected:
      stateName = "connected"
    case .connecting:
      stateName = "connecting"
    case .notConnected:
      stateName = "notConnected"
    @unknown default:
      stateName = "unknown"
    }
    emit("onPeerState", ["peerName": peerID.displayName, "state": stateName])
  }

  func session(
    _ session: MCSession,
    didReceive data: Data,
    fromPeer peerID: MCPeerID
  ) {
    guard let payload = String(data: data, encoding: .utf8) else { return }
    emit("onMessage", ["peerName": peerID.displayName, "payload": payload])
  }

  func session(
    _ session: MCSession,
    didReceive stream: InputStream,
    withName streamName: String,
    fromPeer peerID: MCPeerID
  ) {}

  func session(
    _ session: MCSession,
    didStartReceivingResourceWithName resourceName: String,
    fromPeer peerID: MCPeerID,
    with progress: Progress
  ) {}

  func session(
    _ session: MCSession,
    didFinishReceivingResourceWithName resourceName: String,
    fromPeer peerID: MCPeerID,
    at localURL: URL?,
    withError error: Error?
  ) {}
}

public final class RunmioNearbyModule: Module {
  private lazy var manager = NearbyManager { [weak self] event, payload in
    DispatchQueue.main.async {
      self?.sendEvent(event, payload)
    }
  }

  public func definition() -> ModuleDefinition {
    Name("RunmioNearby")

    Events(
      "onPeersChanged",
      "onInvitation",
      "onPeerState",
      "onMessage",
      "onError"
    )

    AsyncFunction("start") { (displayName: String) in
      manager.start(displayName: displayName)
    }

    AsyncFunction("stop") {
      manager.stop()
    }

    AsyncFunction("invite") { (peerId: String, context: String) in
      manager.invite(peerId: peerId, context: context)
    }

    AsyncFunction("respondToInvitation") { (token: String, accept: Bool) in
      manager.respondToInvitation(token: token, accept: accept)
    }

    AsyncFunction("send") { (payload: String, peerNames: [String]) in
      try manager.send(payload: payload, peerNames: peerNames)
    }

    AsyncFunction("getConnectedPeers") {
      manager.connectedPeerNames()
    }

    OnDestroy {
      manager.stop()
    }
  }
}
