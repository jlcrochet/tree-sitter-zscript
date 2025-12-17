// swift-tools-version:5.3

import Foundation
import PackageDescription

var sources = ["src/parser.c"]
if FileManager.default.fileExists(atPath: "src/scanner.c") {
    sources.append("src/scanner.c")
}

let package = Package(
    name: "TreeSitterZscript",
    products: [
        .library(name: "TreeSitterZscript", targets: ["TreeSitterZscript"]),
    ],
    dependencies: [
        .package(name: "SwiftTreeSitter", url: "https://github.com/tree-sitter/swift-tree-sitter", from: "0.9.0"),
    ],
    targets: [
        .target(
            name: "TreeSitterZscript",
            dependencies: [],
            path: ".",
            sources: sources,
            resources: [
                .copy("queries")
            ],
            publicHeadersPath: "bindings/swift",
            cSettings: [.headerSearchPath("src")]
        ),
        .testTarget(
            name: "TreeSitterZscriptTests",
            dependencies: [
                "SwiftTreeSitter",
                "TreeSitterZscript",
            ],
            path: "bindings/swift/TreeSitterZscriptTests"
        )
    ],
    cLanguageStandard: .c11
)
