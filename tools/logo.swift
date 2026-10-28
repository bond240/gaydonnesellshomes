import Foundation
import CoreImage
import ImageIO
import UniformTypeIdentifiers

// Removes the white background from a logo (white-matte removal), crops to content,
// and writes two PNGs: one keeping the dark text (for light backgrounds) and one with
// neutral/dark pixels turned white (for dark backgrounds). Gradient colors are kept.
let args = CommandLine.arguments
let inURL = URL(fileURLWithPath: args[1]), outDir = args[2]
let ctx = CIContext()
let src = CIImage(contentsOf: inURL, options: [.applyOrientationProperty: true])!

func cube(whiteText: Bool) -> CIImage {
    let n = 64
    var data = [Float](repeating: 0, count: n*n*n*4)
    var i = 0
    for b in 0..<n { for g in 0..<n { for r in 0..<n {
        let rf = Float(r)/Float(n-1), gf = Float(g)/Float(n-1), bf = Float(b)/Float(n-1)
        let mn = min(rf, min(gf, bf)), mx = max(rf, max(gf, bf))
        let alpha = 1 - mn                      // white -> transparent
        var cr: Float = 0, cg: Float = 0, cb: Float = 0
        if alpha > 0.001 {
            cr = (rf - mn) / alpha; cg = (gf - mn) / alpha; cb = (bf - mn) / alpha   // un-matte from white
        }
        let sat = mx - mn
        if sat < 0.18 {                          // neutral: the dark text and its edges
            let v: Float = whiteText ? 1.0 : 0.0
            cr = v; cg = v; cb = v
        }
        data[i] = cr*alpha; data[i+1] = cg*alpha; data[i+2] = cb*alpha; data[i+3] = alpha   // premultiplied
        i += 4
    }}}
    let f = CIFilter(name: "CIColorCube")!
    f.setValue(src, forKey: kCIInputImageKey)
    f.setValue(n, forKey: "inputCubeDimension")
    f.setValue(Data(bytes: data, count: data.count*4), forKey: "inputCubeData")
    return f.outputImage!
}

// Find the content bounding box from the alpha of the processed image.
func bbox(_ img: CIImage) -> CGRect {
    let w = Int(img.extent.width), h = Int(img.extent.height)
    var buf = [UInt8](repeating: 0, count: w*h*4)
    ctx.render(img, toBitmap: &buf, rowBytes: w*4, bounds: img.extent, format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())
    var minX = w, minY = h, maxX = 0, maxY = 0
    for y in 0..<h { for x in 0..<w { if buf[(y*w+x)*4+3] > 16 { minX = min(minX,x); maxX = max(maxX,x); minY = min(minY,y); maxY = max(maxY,y) } } }
    // bitmap rows are top-down; CIImage coords are bottom-up
    let pad = 24
    let x0 = max(0, minX-pad), x1 = min(w, maxX+pad), yTop = max(0, minY-pad), yBot = min(h, maxY+pad)
    return CGRect(x: x0, y: h - yBot, width: x1 - x0, height: yBot - yTop)
}

func write(_ img: CIImage, _ name: String) {
    let cg = ctx.createCGImage(img, from: img.extent)!
    let url = URL(fileURLWithPath: outDir).appendingPathComponent(name)
    let d = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(d, cg, nil); CGImageDestinationFinalize(d)
    print(name, Int(img.extent.width), "x", Int(img.extent.height))
}

let dark = cube(whiteText: false)
let box = bbox(dark)
print("bbox", box)
write(dark.cropped(to: box), "showokc-logo.png")
write(cube(whiteText: true).cropped(to: box), "showokc-logo-white.png")
