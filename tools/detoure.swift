// Détoure une photo du matériel pour l'accueil, avec Vision (macOS 14+), la technique de « Copier le sujet » dans Photos.
// Aucun fond particulier n'est nécessaire (table, boîte, sol).
//   xcrun swift tools/detoure.swift <photo> <dossier de sortie>
// Écrit tous.png (tous les sujets, fond transparent, recadré au plus près) et sujet-N.png (chaque sujet, pleine taille)
// si la photo en contient plusieurs. Ranger tous.png dans public/materiel/ et reporter ses dimensions dans GEAR_PHOTO
// (app/_site/data.js).
import CoreImage
import Foundation
import ImageIO
import Vision

let args = CommandLine.arguments
guard args.count == 3 else { print("usage : xcrun swift tools/detoure.swift <photo> <dossier>"); exit(1) }
let input = URL(fileURLWithPath: args[1])
let outDir = URL(fileURLWithPath: args[2])
guard let src = CGImageSourceCreateWithURL(input as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(src, 0, nil) else { print("lecture impossible"); exit(1) }

let handler = VNImageRequestHandler(cgImage: image, options: [:])
let request = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([request])
guard let result = request.results?.first else { print("aucun sujet trouvé"); exit(1) }

let context = CIContext()
let srgb = CGColorSpace(name: CGColorSpace.sRGB)!
func write(_ buffer: CVPixelBuffer, _ name: String) throws {
  try context.writePNGRepresentation(of: CIImage(cvPixelBuffer: buffer), to: outDir.appendingPathComponent(name), format: .RGBA8, colorSpace: srgb)
}

print("sujets trouvés : \(result.allInstances.count)")
if result.allInstances.count > 1 {
  for instance in result.allInstances {
    try write(try result.generateMaskedImage(ofInstances: [instance], from: handler, croppedToInstancesExtent: false), "sujet-\(instance).png")
  }
}
try write(try result.generateMaskedImage(ofInstances: result.allInstances, from: handler, croppedToInstancesExtent: true), "tous.png")
print("ok")
