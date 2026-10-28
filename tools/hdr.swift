import Foundation
import CoreImage
import ImageIO
import UniformTypeIdentifiers

// Real-estate "HDR look": lift shadows, pull highlights, add vibrance, local contrast, and sharpen.
// Usage: hdr <in> <out> <width|0> [<in> <out> <width> ...]
let ctx = CIContext(options: [.useSoftwareRenderer: false])

func filter(_ name: String, _ img: CIImage, _ params: [String: Any]) -> CIImage {
    let f = CIFilter(name: name)!
    f.setValue(img, forKey: kCIInputImageKey)
    for (k, v) in params { f.setValue(v, forKey: k) }
    return f.outputImage!
}

func process(_ inPath: String, _ outPath: String, _ width: CGFloat) {
    let inURL = URL(fileURLWithPath: inPath), outURL = URL(fileURLWithPath: outPath)
    guard var img = CIImage(contentsOf: inURL, options: [.applyOrientationProperty: true]) else {
        print("SKIP \(inPath)"); return
    }
    if width > 0 && width != img.extent.width {
        let s = width / img.extent.width
        img = filter("CILanczosScaleTransform", img, [kCIInputScaleKey: s, kCIInputAspectRatioKey: 1.0])
    }
    let extent = img.extent
    img = filter("CIHighlightShadowAdjust", img, ["inputShadowAmount": 0.4, "inputHighlightAmount": 0.88, "inputRadius": 1.5])
    img = filter("CIVibrance", img, ["inputAmount": 0.22])
    img = filter("CIColorControls", img, ["inputContrast": 1.04, "inputSaturation": 1.03, "inputBrightness": 0.01])
    img = filter("CIUnsharpMask", img, ["inputRadius": 2.5, "inputIntensity": 0.35])   // clarity / local contrast
    img = filter("CISharpenLuminance", img, ["inputSharpness": 0.35])
    img = img.cropped(to: extent)
    guard let cg = ctx.createCGImage(img, from: extent),
          let dest = CGImageDestinationCreateWithURL(outURL as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else {
        print("FAIL \(inPath)"); return
    }
    CGImageDestinationAddImage(dest, cg, [kCGImageDestinationLossyCompressionQuality: 0.82] as CFDictionary)
    CGImageDestinationFinalize(dest)
}

let a = Array(CommandLine.arguments.dropFirst())
var i = 0
while i + 2 < a.count {
    process(a[i], a[i+1], CGFloat(Double(a[i+2]) ?? 0))
    i += 3
}
print("done \(a.count / 3) images")
