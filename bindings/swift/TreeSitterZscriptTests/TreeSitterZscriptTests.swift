import XCTest
import SwiftTreeSitter
import TreeSitterZscript

final class TreeSitterZscriptTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_zscript())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading ZScript grammar")
    }
}
