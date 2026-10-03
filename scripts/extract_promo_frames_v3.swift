import Foundation
import AVFoundation
import AppKit

guard CommandLine.arguments.count >= 3 else {
    fputs("Usage: extract_promo_frames <video.mp4> <output-dir>\n", stderr)
    exit(1)
}

let videoURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputDir = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
try FileManager.default.createDirectory(at: outputDir, withIntermediateDirectories: true)

let asset = AVURLAsset(url: videoURL)
let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.requestedTimeToleranceBefore = .zero
generator.requestedTimeToleranceAfter = .zero

let timestamps: [Double] = [5, 15, 21, 27, 33, 40, 46, 49.2, 52.0, 55.4, 58.0]
for seconds in timestamps {
    let time = CMTime(seconds: seconds, preferredTimescale: 600)
    let image = try generator.copyCGImage(at: time, actualTime: nil)
    let bitmap = NSBitmapImageRep(cgImage: image)
    guard let data = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.92]) else {
        throw NSError(domain: "RunmioFrameExtract", code: 1)
    }
    let out = outputDir.appendingPathComponent(String(format: "frame_%04.1fs.jpg", seconds))
    try data.write(to: out)
    print(out.path)
}
