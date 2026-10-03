import Foundation
import AVFoundation
import CoreVideo
import CoreGraphics
import ImageIO

func fail(_ message: String) -> Never {
    fputs("ERROR: \(message)\n", stderr)
    exit(1)
}

guard CommandLine.arguments.count >= 5 else {
    fail("Usage: encode_runmio_promo <frames-dir> <fps> <music.wav> <output.mp4>")
}

let framesDir = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
guard let fps = Int32(CommandLine.arguments[2]), fps > 0 else { fail("Invalid fps") }
let audioURL = URL(fileURLWithPath: CommandLine.arguments[3])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[4])
let silentURL = outputURL.deletingLastPathComponent().appendingPathComponent("Runmio_Promo_60s_VI_v3_silent.mp4")

let fm = FileManager.default
let frames: [URL]
do {
    frames = try fm.contentsOfDirectory(at: framesDir, includingPropertiesForKeys: nil)
        .filter { $0.pathExtension.lowercased() == "jpg" }
        .sorted { $0.lastPathComponent < $1.lastPathComponent }
} catch {
    fail("Cannot list frames: \(error)")
}
guard !frames.isEmpty else { fail("No JPEG frames found") }

try? fm.removeItem(at: silentURL)
try? fm.removeItem(at: outputURL)

let width = 1080
let height = 1920
let writer: AVAssetWriter
do { writer = try AVAssetWriter(outputURL: silentURL, fileType: .mp4) }
catch { fail("Cannot create writer: \(error)") }

let settings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: 14_000_000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        AVVideoMaxKeyFrameIntervalKey: Int(fps) * 2
    ]
]

let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
input.expectsMediaDataInRealTime = false
guard writer.canAdd(input) else { fail("Writer cannot add video input") }
writer.add(input)

let attrs: [String: Any] = [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    kCVPixelBufferWidthKey as String: width,
    kCVPixelBufferHeightKey as String: height,
    kCVPixelBufferCGImageCompatibilityKey as String: true,
    kCVPixelBufferCGBitmapContextCompatibilityKey as String: true,
]
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: attrs)

guard writer.startWriting() else { fail("startWriting failed: \(writer.error?.localizedDescription ?? "unknown")") }
writer.startSession(atSourceTime: .zero)

func loadCGImage(_ url: URL) -> CGImage? {
    guard let src = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
    return CGImageSourceCreateImageAtIndex(src, 0, nil)
}

for (index, url) in frames.enumerated() {
    while !input.isReadyForMoreMediaData { usleep(1000) }
    guard let pool = adaptor.pixelBufferPool else { fail("No pixel buffer pool") }
    var maybe: CVPixelBuffer?
    let status = CVPixelBufferPoolCreatePixelBuffer(nil, pool, &maybe)
    guard status == kCVReturnSuccess, let pb = maybe else { fail("Cannot create pixel buffer at frame \(index)") }
    guard let image = loadCGImage(url) else { fail("Cannot read \(url.path)") }

    CVPixelBufferLockBaseAddress(pb, [])
    guard let base = CVPixelBufferGetBaseAddress(pb) else { fail("No pixel buffer base address") }
    let bytesPerRow = CVPixelBufferGetBytesPerRow(pb)
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    guard let ctx = CGContext(
        data: base, width: width, height: height, bitsPerComponent: 8,
        bytesPerRow: bytesPerRow, space: colorSpace,
        bitmapInfo: CGBitmapInfo.byteOrder32Little.rawValue | CGImageAlphaInfo.premultipliedFirst.rawValue
    ) else { fail("Cannot make CGContext") }

    ctx.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    CVPixelBufferUnlockBaseAddress(pb, [])

    let time = CMTime(value: CMTimeValue(index), timescale: fps)
    if !adaptor.append(pb, withPresentationTime: time) {
        fail("append failed at frame \(index): \(writer.error?.localizedDescription ?? "unknown")")
    }
    if index % Int(fps * 5) == 0 { print("encode: \(index)/\(frames.count)") }
}

input.markAsFinished()
let finishSemaphore = DispatchSemaphore(value: 0)
writer.finishWriting { finishSemaphore.signal() }
finishSemaphore.wait()
guard writer.status == .completed else { fail("Video writer failed: \(writer.error?.localizedDescription ?? "unknown")") }

// Mux the original procedural music under the rendered video.
let videoAsset = AVURLAsset(url: silentURL)
let audioAsset = AVURLAsset(url: audioURL)
let composition = AVMutableComposition()
guard
    let sourceVideo = videoAsset.tracks(withMediaType: .video).first,
    let videoTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)
else { fail("Cannot create composition video track") }

do {
    try videoTrack.insertTimeRange(CMTimeRange(start: .zero, duration: videoAsset.duration), of: sourceVideo, at: .zero)
    videoTrack.preferredTransform = sourceVideo.preferredTransform
} catch { fail("Cannot insert video: \(error)") }

if let sourceAudio = audioAsset.tracks(withMediaType: .audio).first,
   let audioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
    do {
        let duration = CMTimeMinimum(videoAsset.duration, audioAsset.duration)
        try audioTrack.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: sourceAudio, at: .zero)
    } catch { fail("Cannot insert audio: \(error)") }
} else {
    fail("Cannot read generated music")
}

guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
    fail("Cannot create export session")
}
exporter.outputURL = outputURL
exporter.outputFileType = .mp4
exporter.shouldOptimizeForNetworkUse = true
let exportSemaphore = DispatchSemaphore(value: 0)
exporter.exportAsynchronously { exportSemaphore.signal() }
exportSemaphore.wait()
guard exporter.status == .completed else {
    fail("Final export failed: \(exporter.error?.localizedDescription ?? "unknown")")
}

print("DONE: \(outputURL.path)")
