package tree_sitter_zscript_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_zscript "github.com/jlcrochet/tree-sitter-zscript/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_zscript.Language())
	if language == nil {
		t.Errorf("Error loading ZScript grammar")
	}
}
