import {
  NativeModule,
  requireOptionalNativeModule,
} from "expo";

export interface NearbyPeer {
  id: string;
  name: string;
}

export interface NearbyInvitation {
  token: string;
  peerName: string;
  context: string;
}

export interface NearbyPeerState {
  peerName: string;
  state: "connected" | "connecting" | "notConnected" | "unknown";
}

export interface NearbyMessage {
  peerName: string;
  payload: string;
}

type NearbyEventSubscription = { remove(): void };

type NearbyEvents = {
  onPeersChanged: (event: { peers: NearbyPeer[] }) => void;
  onInvitation: (event: NearbyInvitation) => void;
  onPeerState: (event: NearbyPeerState) => void;
  onMessage: (event: NearbyMessage) => void;
  onError: (event: { message: string }) => void;
};

declare class RunmioNearbyNativeModule extends NativeModule<NearbyEvents> {
  start(displayName: string): Promise<void>;
  stop(): Promise<void>;
  invite(peerId: string, context: string): Promise<boolean>;
  respondToInvitation(token: string, accept: boolean): Promise<boolean>;
  send(payload: string, peerNames: string[]): Promise<number>;
  getConnectedPeers(): Promise<string[]>;
}

const native =
  requireOptionalNativeModule<RunmioNearbyNativeModule>("RunmioNearby");

export const nearbyGroupsSupported = native != null;

const unavailable = () => new Error("NEARBY_GROUPS_UNAVAILABLE");

export async function startNearby(displayName: string) {
  if (!native) throw unavailable();
  await native.start(displayName);
}

export async function stopNearby() {
  if (!native) return;
  await native.stop();
}

export async function inviteNearbyPeer(
  peerId: string,
  context: Record<string, unknown>,
) {
  if (!native) throw unavailable();
  return native.invite(peerId, JSON.stringify(context));
}

export async function respondToNearbyInvitation(
  token: string,
  accept: boolean,
) {
  if (!native) throw unavailable();
  return native.respondToInvitation(token, accept);
}

export async function sendNearbyMessage(
  payload: Record<string, unknown>,
  peerNames: string[],
) {
  if (!native) throw unavailable();
  return native.send(JSON.stringify(payload), peerNames);
}

export async function getConnectedNearbyPeers() {
  if (!native) return [];
  return native.getConnectedPeers();
}

export function addNearbyListener<EventName extends keyof NearbyEvents>(
  eventName: EventName,
  listener: NearbyEvents[EventName],
): NearbyEventSubscription {
  if (!native) return { remove() {} };
  return native.addListener(eventName, listener);
}
