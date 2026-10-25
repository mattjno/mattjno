// Pose le matériel d'une photo sur un fond noir, pour l'accueil : détourage avec Vision (macOS 14+), bords resserrés
// pour effacer le liseré du fond d'origine, balance des blancs sur un objet blanc de la photo, recadrage serré.
//   xcrun swift tools/fond-noir.swift <photo> <sortie.jpg> [blanc=x,y,l,h] [neutre=x,y,l,h ...]
// Rectangles en pixels, depuis le haut à gauche de la photo :
//   blanc  : une zone blanche (le pare-soleil d'un téléobjectif blanc). Elle devient neutre : la lumière chaude
//            d'une pièce disparaît. Sans elle, couleurs d'origine.
//   neutre : une zone où ne garder que les couleurs neutres (noir, gris : une dragonne, une sangle) : un fond chaud
//            vu à travers, ici le parquet dans la boucle de la dragonne du monopode, disparaît. Autant qu'il faut.
import CoreImage
import Foundation
import ImageIO
import Vision

let args = CommandLine.arguments
guard args.count >= 3 else { print("usage : xcrun swift tools/fond-noir.swift <photo> <sortie.jpg> [blanc=x,y,l,h] [neutre=x,y,l,h ...]"); exit(1) }
guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: args[1]) as CFURL, nil),
      let cg = CGImageSourceCreateImageAtIndex(src, 0, nil) else { print("lecture impossible"); exit(1) }
let W = CGFloat(cg.width)
let H = CGFloat(cg.height)
let photo = CIImage(cgImage: cg)
// Rectangle « x,y,l,h » compté depuis le haut à gauche, en coordonnées Core Image (origine en bas à gauche)
func zone(_ text: Substring) -> CGRect {
  let v = text.split(separator: ",").compactMap { Double($0) }
  return CGRect(x: v[0], y: Double(H) - v[1] - v[3], width: v[2], height: v[3])
}
let options = args.dropFirst(3)
let white = options.first { $0.hasPrefix("blanc=") }.map { zone($0.dropFirst(6)) }
let neutralZones = options.filter { $0.hasPrefix("neutre=") }.map { zone($0.dropFirst(7)) }

// Les objets de la photo, réunis dans un seul masque à la taille de l'image
let handler = VNImageRequestHandler(cgImage: cg, options: [:])
let request = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([request])
guard let result = request.results?.first else { print("aucun objet trouvé"); exit(1) }
let buffer = try result.generateScaledMaskForImage(forInstances: result.allInstances, from: handler)
print("objets : \(result.allInstances.count)")

// Cadre serré autour des objets, avec une marge de 6 %
CVPixelBufferLockBaseAddress(buffer, .readOnly)
let bw = CVPixelBufferGetWidth(buffer)
let bh = CVPixelBufferGetHeight(buffer)
let row = CVPixelBufferGetBytesPerRow(buffer) / MemoryLayout<Float32>.size
let px = CVPixelBufferGetBaseAddress(buffer)!.assumingMemoryBound(to: Float32.self)
var (x0, y0, x1, y1) = (bw, bh, 0, 0)
for y in 0..<bh { for x in 0..<bw where px[y * row + x] > 0.5 { x0 = min(x0, x); x1 = max(x1, x); y0 = min(y0, y); y1 = max(y1, y) } }
CVPixelBufferUnlockBaseAddress(buffer, .readOnly)
let pad = 0.06 * CGFloat(max(x1 - x0, y1 - y0))
let top = max(0, CGFloat(y0) - pad)
let bottom = min(H, CGFloat(y1) + pad)
let crop = CGRect(x: max(0, CGFloat(x0) - pad), y: H - bottom, width: min(W, CGFloat(x1) + pad) - max(0, CGFloat(x0) - pad), height: bottom - top)

// Bords : le masque est rendu franc (sous 0,35 rien, au-dessus de 0,65 tout : ses zones floues laissaient voir le
// fond d'origine en voile), resserré de deux pixels, puis adouci
let gain = 1 / 0.3
let bias = -0.35 / 0.3
var mask = CIImage(cvPixelBuffer: buffer)
  .applyingFilter("CIColorMatrix", parameters: [
    "inputRVector": CIVector(x: gain, y: 0, z: 0, w: 0), "inputGVector": CIVector(x: gain, y: 0, z: 0, w: 0),
    "inputBVector": CIVector(x: gain, y: 0, z: 0, w: 0), "inputBiasVector": CIVector(x: bias, y: bias, z: bias, w: 0),
  ])
  .applyingFilter("CIColorClamp")
mask = mask.applyingFilter("CIMorphologyMinimum", parameters: [kCIInputRadiusKey: 2.0])
mask = mask.clampedToExtent().applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: 1.0]).cropped(to: photo.extent)
// Zones « neutre » : seules les couleurs neutres y restent. L'écart rouge moins bleu (en lumière linéaire) mesure la
// chaleur : jusqu'à 0,03 on garde (noir, gris), au-delà de 0,08 on retire (le bois)
if !neutralZones.isEmpty {
  let neutral = photo
    .applyingFilter("CIColorMatrix", parameters: [
      "inputRVector": CIVector(x: -20, y: 0, z: 20, w: 0),
      "inputGVector": CIVector(x: -20, y: 0, z: 20, w: 0),
      "inputBVector": CIVector(x: -20, y: 0, z: 20, w: 0),
      "inputBiasVector": CIVector(x: 1.6, y: 1.6, z: 1.6, w: 0),
    ])
    .applyingFilter("CIColorClamp")
  let onlyNeutral = mask.applyingFilter("CIMultiplyCompositing", parameters: [kCIInputBackgroundImageKey: neutral])
  for z in neutralZones { mask = onlyNeutral.cropped(to: z).composited(over: mask) }
}

// Balance des blancs : la zone désignée devient neutre, sans changer sa luminosité
var image = photo
if let zone = white {
  let average = photo.applyingFilter("CIAreaAverage", parameters: [kCIInputExtentKey: CIVector(cgRect: zone)])
  var rgba = [UInt8](repeating: 0, count: 4)
  CIContext().render(average, toBitmap: &rgba, rowBytes: 4, bounds: CGRect(x: 0, y: 0, width: 1, height: 1), format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
  let (r, g, b) = (CGFloat(rgba[0]), CGFloat(rgba[1]), CGFloat(rgba[2]))
  let top = max(r, g, b)
  print("blanc de référence : \(rgba[0]), \(rgba[1]), \(rgba[2])")
  image = photo.applyingFilter("CIColorMatrix", parameters: [
    "inputRVector": CIVector(x: top / r, y: 0, z: 0, w: 0),
    "inputGVector": CIVector(x: 0, y: top / g, z: 0, w: 0),
    "inputBVector": CIVector(x: 0, y: 0, z: top / b, w: 0),
  ])
}

// Le matériel sur du noir, recadré
let black = CIImage(color: CIColor.black).cropped(to: photo.extent)
let out = image.applyingFilter("CIBlendWithMask", parameters: [kCIInputBackgroundImageKey: black, kCIInputMaskImageKey: mask])
  .cropped(to: crop)
  .transformed(by: CGAffineTransform(translationX: -crop.minX, y: -crop.minY))
try CIContext().writeJPEGRepresentation(of: out, to: URL(fileURLWithPath: args[2]), colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!, options: [CIImageRepresentationOption(rawValue: kCGImageDestinationLossyCompressionQuality as String): 0.9])
print("ok \(Int(crop.width)) × \(Int(crop.height)), depuis (\(Int(crop.minX)), \(Int(H - crop.maxY)))")
