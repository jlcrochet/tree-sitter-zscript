#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <stdint.h>

enum TokenType {
    EXTEND_CLASS_TO_EOF_GUARD,
};

static bool is_ascii_word_char(int32_t c) {
    return (c >= 'a' && c <= 'z') ||
           (c >= 'A' && c <= 'Z') ||
           (c >= '0' && c <= '9') ||
           c == '_';
}

static int32_t fold_ascii(int32_t c) {
    if (c >= 'A' && c <= 'Z') {
        return c + ('a' - 'A');
    }
    return c;
}

static bool advance_keyword(TSLexer *lexer, const char *keyword, bool skip) {
    for (const char *c = keyword; *c; c++) {
        if (fold_ascii(lexer->lookahead) != *c) {
            return false;
        }
        lexer->advance(lexer, skip);
    }
    return !is_ascii_word_char(lexer->lookahead);
}

static bool skip_line_continuation(TSLexer *lexer) {
    if (lexer->lookahead != '\\') {
        return false;
    }

    lexer->advance(lexer, true);
    if (lexer->lookahead == '\r') {
        lexer->advance(lexer, true);
    }
    if (lexer->lookahead != '\n') {
        return false;
    }
    lexer->advance(lexer, true);
    return true;
}

static bool skip_comment(TSLexer *lexer) {
    if (lexer->lookahead != '/') {
        return false;
    }

    lexer->advance(lexer, true);
    if (lexer->lookahead == '/') {
        while (lexer->lookahead && lexer->lookahead != '\n') {
            lexer->advance(lexer, true);
        }
        return true;
    }

    if (lexer->lookahead == '*') {
        lexer->advance(lexer, true);
        while (lexer->lookahead) {
            if (lexer->lookahead == '*') {
                lexer->advance(lexer, true);
                if (lexer->lookahead == '/') {
                    lexer->advance(lexer, true);
                    return true;
                }
                continue;
            }
            lexer->advance(lexer, true);
        }
    }

    return false;
}

static void skip_extras(TSLexer *lexer) {
    for (;;) {
        if (lexer->lookahead == ' ' || lexer->lookahead == '\t' ||
            lexer->lookahead == '\n' || lexer->lookahead == '\r' ||
            lexer->lookahead == '\f' || lexer->lookahead == '\v') {
            lexer->advance(lexer, true);
            continue;
        }

        if (skip_line_continuation(lexer)) {
            continue;
        }

        if (skip_comment(lexer)) {
            continue;
        }

        return;
    }
}

static void skip_string_literal(TSLexer *lexer) {
    lexer->advance(lexer, true);
    while (lexer->lookahead) {
        if (lexer->lookahead == '\\') {
            lexer->advance(lexer, true);
            if (lexer->lookahead) {
                lexer->advance(lexer, true);
            }
            continue;
        }

        if (lexer->lookahead == '"') {
            lexer->advance(lexer, true);
            return;
        }

        lexer->advance(lexer, true);
    }
}

static bool scan_extend_class_to_eof_guard(TSLexer *lexer) {
    lexer->mark_end(lexer);
    skip_extras(lexer);

    if (!advance_keyword(lexer, "class", true)) {
        return false;
    }

    int paren_depth = 0;
    for (;;) {
        skip_extras(lexer);

        if (lexer->lookahead == 0) {
            return false;
        }

        if (lexer->lookahead == '"') {
            skip_string_literal(lexer);
            continue;
        }

        if (lexer->lookahead == '(') {
            paren_depth++;
            lexer->advance(lexer, true);
            continue;
        }

        if (lexer->lookahead == ')') {
            if (paren_depth > 0) {
                paren_depth--;
            }
            lexer->advance(lexer, true);
            continue;
        }

        if (paren_depth == 0) {
            if (lexer->lookahead == ';') {
                lexer->result_symbol = EXTEND_CLASS_TO_EOF_GUARD;
                return true;
            }

            if (lexer->lookahead == '{') {
                return false;
            }
        }

        lexer->advance(lexer, true);
    }
}

void *tree_sitter_zscript_external_scanner_create(void) {
    return NULL;
}

void tree_sitter_zscript_external_scanner_destroy(void *payload) {
    (void)payload;
}

unsigned tree_sitter_zscript_external_scanner_serialize(void *payload, char *buffer) {
    (void)payload;
    (void)buffer;
    return 0;
}

void tree_sitter_zscript_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
    (void)payload;
    (void)buffer;
    (void)length;
}

bool tree_sitter_zscript_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
    (void)payload;

    if (valid_symbols[EXTEND_CLASS_TO_EOF_GUARD]) {
        return scan_extend_class_to_eof_guard(lexer);
    }

    return false;
}
