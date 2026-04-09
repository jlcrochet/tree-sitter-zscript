/**
 * @file ZScript grammar for Tree-sitter
 * @author Jeffrey Crochet <jlcrochet91@pm.me>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  PAREN_DECLARATOR: -10,
  ASSIGNMENT: -2,
  CONDITIONAL: -1,
  DEFAULT: 0,
  LOGICAL_OR: 1,
  LOGICAL_AND: 2,
  INCLUSIVE_OR: 3,
  EXCLUSIVE_OR: 4,
  BITWISE_AND: 5,
  EQUAL: 6,
  RELATIONAL: 7,
  CONCAT: 8, // ZScript string concatenation
  SHIFT: 9,
  ADD: 10,
  MULTIPLY: 11,
  CAST: 12,
  SIZEOF: 13,
  UNARY: 14,
  CALL: 15,
  FIELD: 16,
  SUBSCRIPT: 17,
};

const SHADOWABLE_WORDS = [
  {word: 'array'},
  {word: 'bool', primitive_type: true},
  {word: 'byte', primitive_type: true},
  {word: 'color', primitive_type: true},
  {word: 'default'},
  {word: 'double', primitive_type: true},
  {word: 'float', primitive_type: true},
  {word: 'int', primitive_type: true},
  {word: 'int8', primitive_type: true},
  {word: 'int16', primitive_type: true},
  {word: 'map'},
  {word: 'mapiterator'},
  {word: 'name', primitive_type: true},
  {word: 'none'},
  {word: 'property'},
  {word: 'sbyte', primitive_type: true},
  {word: 'short'},
  {word: 'sound', primitive_type: true},
  {word: 'state', primitive_type: true},
  {word: 'string', primitive_type: true},
  {word: 'uint', primitive_type: true},
  {word: 'uint8', primitive_type: true},
  {word: 'uint16', primitive_type: true},
  {word: 'ushort', primitive_type: true},
  {word: 'vector2', primitive_type: true},
  {word: 'vector3', primitive_type: true},
  {word: 'void', primitive_type: true},
];

const SHADOWABLE_IDENTIFIER_WORDS = SHADOWABLE_WORDS.map(({word}) => word);
const SHADOWABLE_PRIMITIVE_TYPE_WORDS = SHADOWABLE_WORDS
  .filter(({primitive_type}) => primitive_type)
  .map(({word}) => word);
const SPECIAL_PRIMITIVE_TYPE_WORDS = ['statelabel', 'spriteid', 'textureid', 'voidptr', 'let'];
const ENUM_INTEGER_TYPE_WORDS = ['sbyte', 'byte', 'short', 'ushort', 'int', 'uint'];

const RESERVED_WORDS = [
  ...SHADOWABLE_IDENTIFIER_WORDS,
  'abstract',
  'action',
  'alignof',
  'auto',
  'break',
  'case',
  'char',
  'class',
  'clearscope',
  'const',
  'cross',
  'continue',
  'deprecated',
  'do',
  'dot',
  'else',
  'enum',
  'extend',
  'extern',
  'fail',
  'false',
  'final',
  'flagdef',
  'for',
  'foreach',
  'function',
  'goto',
  'if',
  'in',
  'internal',
  'is',
  'latent',
  'let',
  'long',
  'loop',
  'meta',
  'mixin',
  'native',
  'norollback',
  'null',
  'nullptr',
  'out',
  'override',
  'play',
  'private',
  'protected',
  'readonly',
  'replaces',
  'return',
  'sealed',
  'sizeof',
  'states',
  'static',
  'stop',
  'struct',
  'super',
  'switch',
  'transient',
  'true',
  'ui',
  'ulong',
  'unsafe',
  'var',
  'vararg',
  'version',
  'virtual',
  'virtualscope',
  'volatile',
  'wait',
  'while',
];

const STATE_FLOW_WORDS = ['goto', 'stop', 'wait', 'fail', 'loop'];
const SIMPLE_STATE_FLOW_WORDS = STATE_FLOW_WORDS.filter(word => word !== 'goto');
const SHADOWABLE_IDENTIFIER_WORD_SET = new Set(SHADOWABLE_IDENTIFIER_WORDS);
const STATE_FLOW_WORD_SET = new Set(STATE_FLOW_WORDS);
const STATE_LABEL_KEYWORD_WORDS = RESERVED_WORDS.filter(
  word => !SHADOWABLE_IDENTIFIER_WORD_SET.has(word) && !STATE_FLOW_WORD_SET.has(word)
);
const STATE_SPRITE_NAME_CHARS = [...'abcdefghijklmnopqrstuvwxyz0123456789_'];
const NON_FLOW_STATE_SPRITE_NAME_PATTERNS = buildExcludedWordPatterns(
  STATE_FLOW_WORDS,
  STATE_SPRITE_NAME_CHARS,
);

const CLASS_FLAG_WORDS = ['abstract', 'final', 'native', 'ui', 'play'];
const STRUCT_FLAG_WORDS = ['ui', 'play', 'clearscope', 'native'];
const MEMBER_MODIFIER_WORDS = [
  'abstract',
  'native',
  'static',
  'private',
  'protected',
  'latent',
  'final',
  'meta',
  'transient',
  'norollback',
  'readonly',
  'internal',
  'virtual',
  'override',
  'vararg',
  'ui',
  'play',
  'clearscope',
  'virtualscope',
];
const FUNCTION_SCOPE_WORDS = ['ui', 'play', 'clearscope'];
const PARAMETER_MODIFIER_WORDS = ['in', 'out'];

const NON_RESERVED_IDENTIFIER_PATTERN = buildIdentifierPattern(RESERVED_WORDS);

module.exports = grammar({
  name: "zscript",

  externals: $ => [
    $._extend_class_to_eof_guard,
  ],

  conflicts: $ => [
    [$.type_specifier, $.expression],
    [$.field_declaration, $._return_type],
    [$.primitive_type, $._shadowable_identifier],
    [$.vector_literal],
    [$.return_value_list, $.vector_literal],
  ],

  extras: $ => [
    /\s|\\\r?\n/,
    $.comment,
  ],

  inline: $ => [
    $._type_identifier,
    $._field_identifier,
    $._statement_identifier,
    $._non_case_statement,
    $._assignment_left_expression,
  ],

  supertypes: $ => [
    $.expression,
    $.statement,
    $.type_specifier,
    $.declarator,
  ],

  word: $ => $._word_identifier,

  rules: {
    source_file: $ => seq(
      optional($.version_directive),
      repeat($._top_level_item),
      optional(alias($._eof_class_definition, $.class_definition)),
    ),

    _top_level_item: $ => choice(
      $.class_definition,
      $.struct_definition,
      $.enum_definition,
      $.const_definition,
      $.include_directive,
    ),

    // =========================================================================
    // Include and Version directives
    // =========================================================================

    include_directive: $ => seq(
      keyword('#include'),
      field('path', $.string_literal),
    ),

    version_directive: $ => seq(
      keyword('version'),
      field('version', $.string_literal),
    ),

    // =========================================================================
    // Class definition
    // =========================================================================

    class_definition: $ => prec(1, seq(
      classHeader($, optional($.class_modifier)),
      '{',
      repeat($._class_body_item),
      '}',
    )),

    _eof_class_definition: $ => prec(1, seq(
      choice(
        classHeader($),
        classHeader($, seq(
          alias(keyword('extend'), $.class_modifier),
          $._extend_class_to_eof_guard,
        )),
      ),
      ';',
      repeat($._class_body_item),
    )),

    class_modifier: _ => choice(
      keyword('extend'),
      keyword('mixin'),
    ),

    inheritance_specifier: $ => seq(
      ':',
      field('parent', $._dottable_type_identifier),
    ),

    class_flags: $ => repeat1($.class_flag),

    class_flag: $ => choice(
      ...keywordRules(CLASS_FLAG_WORDS),
      seq(keyword('replaces'), $._dottable_type_identifier),
      seq(keyword('sealed'), '(', commaSep1($.identifier), ')'),
      $._version_modifier,
      $._deprecated_modifier,
    ),

    // =========================================================================
    // Struct definition
    // =========================================================================

    struct_definition: $ => choice(
      structDefinition($),
      structDefinition($, keyword('extend')),
    ),

    struct_flags: $ => repeat1($.struct_flag),

    struct_flag: $ => choice(
      ...keywordRules(STRUCT_FLAG_WORDS),
      $._unsafe_internal_modifier,
      $._version_modifier,
      $._deprecated_modifier,
    ),

    _struct_body_item: $ => choice(
      $.method_definition,
      $.field_declaration,
      $.flag_definition,
      $.const_definition,
      $.enum_definition,
      $.static_const_array,
    ),

    // =========================================================================
    // Enum definition
    // =========================================================================

    enum_definition: $ => seq(
      keyword('enum'),
      field('name', $._type_identifier),
      optional($.enum_base_type),
      '{',
      optional($.enumerator_list),
      '}',
      optional(';'),
    ),

    enum_base_type: $ => seq(
      ':',
      alias($._enum_integer_type, $.primitive_type),
    ),

    _enum_integer_type: _ => choice(...wordTokens(ENUM_INTEGER_TYPE_WORDS)),

    enumerator_list: $ => seq(
      $.enumerator,
      repeat(seq(',', $.enumerator)),
      optional(','),
    ),

    enumerator: $ => seq(
      field('name', $.identifier),
      optional(seq('=', field('value', $.expression))),
    ),

    // =========================================================================
    // Const definition
    // =========================================================================

    const_definition: $ => prec(1, seq(
      keyword('const'),
      field('name', $.identifier),
      '=',
      field('value', $.expression),
      ';',
    )),

    // =========================================================================
    // Class body items
    // =========================================================================

    _class_body_item: $ => choice(
      $.method_definition,
      $.field_declaration,
      $.default_block,
      $.states_block,
      $.property_definition,
      $.flag_definition,
      $.const_definition,
      $.enum_definition,
      $.mixin_statement,
      $.static_const_array,
    ),

    // =========================================================================
    // Field declaration
    // =========================================================================

    field_declaration: $ => seq(
      optional($.member_modifiers),
      typedDeclaratorList($.type_specifier, $._variable_declarator),
    ),

    member_modifiers: $ => prec.left(repeat1($.member_modifier)),

    member_modifier: $ => choice(
      ...keywordRules(MEMBER_MODIFIER_WORDS),
      $._unsafe_clearscope_modifier,
      seq(keyword('action'), optional($.states_options)),
      $._version_modifier,
      $._deprecated_modifier,
    ),

    _deprecated_modifier: $ => seq(
      keyword('deprecated'),
      '(',
      $.string_literal,
      optional(seq(',', $.string_literal)),
      ')',
    ),

    _version_modifier: $ => seq(
      keyword('version'),
      '(',
      $.string_literal,
      ')',
    ),

    _unsafe_clearscope_modifier: _ => unsafeModifier('clearscope'),

    _unsafe_internal_modifier: _ => unsafeModifier('internal'),

    _return_type: $ => choice(
      $.type_specifier,
      $.multi_return_type,
    ),

    _variable_declarator: $ => choice(
      $.array_declarator,
      $.init_declarator,
      $.identifier,
    ),

    // =========================================================================
    // Method definition
    // =========================================================================

    method_definition: $ => seq(
      optional($.member_modifiers),
      field('type', $._return_type),
      field('name', $.identifier),
      field('parameters', $.parameter_list),
      optional($.const_qualifier),
      choice(
        field('body', $.compound_statement),
        ';',
      ),
    ),

    const_qualifier: _ => choice(
      keyword('const'),
      unsafeModifier('const'),
    ),

    multi_return_type: $ => prec.right(seq(
      $.type_specifier,
      repeat1(seq(',', $.type_specifier)),
    )),

    // =========================================================================
    // Property and Flag definitions
    // =========================================================================

    property_definition: $ => seq(
      keyword('property'),
      field('name', $.identifier),
      ':',
      commaSep1(field('field', $.identifier)),
      ';',
    ),

    flag_definition: $ => seq(
      keyword('flagdef'),
      optional(keyword('internal')),
      field('name', $.identifier),
      ':',
      field('field', $.identifier),
      ',',
      field('bit', $.number_literal),
      ';',
    ),

    // =========================================================================
    // Mixin statement
    // =========================================================================

    mixin_statement: $ => seq(
      keyword('mixin'),
      $._type_identifier,
      ';',
    ),

    // =========================================================================
    // Static const array
    // =========================================================================

    static_const_array: $ => seq(
      keyword('static'),
      keyword('const'),
      field('type', $.type_specifier),
      choice(
        seq(field('name', $.identifier), '[', ']'),
        seq('[', ']', field('name', $.identifier)),
      ),
      '=',
      $.initializer_list,
      ';',
    ),

    // =========================================================================
    // Default block
    // =========================================================================

    default_block: $ => seq(
      $._default_keyword,
      '{',
      repeat($.default_property),
      '}',
    ),

    default_property: $ => choice(
      $.property_assignment,
      $.flag_statement,
      $.empty_default_statement,
    ),

    empty_default_statement: _ => ';',

    property_assignment: $ => seq(
      field('property', $.property_identifier),
      optional(field('value', commaSep1($.expression))),
      ';',
    ),

    property_identifier: $ => twoSegmentDottableName($),

    flag_statement: $ => prec.right(seq(
      field('sign', choice('+', '-')),
      field('flag', $.flag_name),
      optional(';'),
    )),

    flag_name: $ => twoSegmentDottableName($),

    // =========================================================================
    // States block
    // =========================================================================

    states_block: $ => seq(
      keywordWithPrecedence('states', 1),
      optional($.states_options),
      '{',
      repeat($._states_body_item),
      '}',
    ),

    states_options: $ => seq(
      '(',
      commaSep1($.identifier),
      ')',
    ),

    _states_body_item: $ => choice(
      $.state_label,
      $.state_flow,
      $.state_line,
    ),

    // A state label followed by its body (state lines and flow control)
    // The body is captured to enable proper indentation queries
    state_label: $ => prec.right(seq(
      field('name', $.state_label_name),
      ':',
      field('body', optional($.state_body)),
    )),

    // The body of a state label - contains state lines and optionally ends with flow control
    state_body: $ => prec.right(repeat1(choice(
      $.state_flow,
      $.state_line,
    ))),

    state_label_name: $ => seq(
      $._state_label_segment,
      repeat(seq('.', $._state_label_segment)),
    ),

    state_line: $ => prec.right(choice(
      seq(
        field('sprite_frames', $._state_sprite_frames),
        field('duration', $._state_duration),
        optional($.state_modifiers),
        field('action', $.compound_statement),
      ),
      seq(
        field('sprite_frames', $._state_sprite_frames),
        field('duration', $._state_duration),
        optional($.state_modifiers),
        optional($.state_action_call),
        ';',
      ),
    )),

    _state_sprite_frames: $ => choice(
      $.state_sprite_frames,
      $.quoted_state_sprite_frames,
      $.mixed_quoted_state_sprite_frames,
    ),

    // Combined state sprite + frames as a SINGLE token
    // This prevents ambiguity with 4-letter state labels like "SHRL:"
    // because the entire "TROO A" or "TNT1 ABCD" is matched as one token.
    // If followed by ':', it won't match this pattern and will fall through to identifier.
    //
    // Pattern breakdown:
    // - ("[^"\\r\\n]{4}"|"[A-Za-z0-9_]{4}"|####|[A-Za-z0-9_]{4}) - sprite part
    // - [ \t]+ - required whitespace
    // - ("[^"\\r\\n]+"|[A-Za-z0-9\[\]\\#]+) - frame characters
    state_sprite_frames: _ => token(prec(1, seq(
      choice(
        /####/,
        // Exclude exact unquoted state-flow spellings like `Goto Ready;`
        // so they stay on the flow-control path instead of becoming sprite/frame pairs.
        ...NON_FLOW_STATE_SPRITE_NAME_PATTERNS,
      ),
      /[ \t]+/,
      /[A-Za-z0-9\[\]\\#]+/,
    ))),

    quoted_state_sprite_frames: $ => seq(
      $.string_literal,
      choice(
        $.string_literal,
        alias(token(/[A-Za-z0-9\[\]\\#]+/), $.state_frame_chars),
      ),
    ),

    mixed_quoted_state_sprite_frames: _ => token(prec(1, /[A-Za-z0-9_#]{4}[ \t]+"[^"\r\n]+"/)),

    _state_duration: $ => choice(
      $.number_literal,
      seq('-', $.number_literal),
      $.random_expression,
    ),

    state_modifiers: $ => repeat1($.state_modifier),

    state_modifier: $ => choice(
      keyword('bright'),
      keyword('fast'),
      keyword('slow'),
      keyword('ticadjust'),
      keyword('nodelay'),
      keyword('canraise'),
      seq(keyword('light'), '(', commaSep1($.string_literal), ')'),
      seq(keyword('offset'), '(', $.expression, ',', $.expression, ')'),
    ),

    state_action_call: $ => seq(
      field('function', $.identifier),
      optional(field('arguments', $.argument_list)),
    ),

    state_flow: $ => choice(
      ...SIMPLE_STATE_FLOW_WORDS.map(word => seq(keyword(word), ';')),
      $.goto_state_flow,
    ),

    goto_state_flow: $ => prec(3, seq(
      // Require trailing horizontal whitespace so labels like `GotoDeath:`
      // are not mis-tokenized as a `goto` flow statement.
      alias(token(prec(2, /[Gg][Oo][Tt][Oo][ \t]+/)), 'goto'),
      field('target', $.state_goto_target),
      alias(token(seq(/[ \t]*/, ';')), ';'),
    )),

    state_goto_target: $ => prec.right(seq(
      optional(seq(field('class', $.state_goto_qualifier), '::')),
      $.dottable_name,
      optional(seq('+', $.number_literal)),
    )),

    state_goto_qualifier: $ => choice(
      $._type_identifier,
      alias(token(prec(-1, wordPattern('super'))), $.type_identifier),
    ),

    // =========================================================================
    // Type specifiers
    // =========================================================================

    type_specifier: $ => choice(
      prec.dynamic(1, $.primitive_type),
      $.sized_type_specifier,
      $.class_type,
      $.array_type,
      $.map_type,
      $.mapiterator_type,
      $.function_type,
      referenceTypeIdentifier($),
      $.readonly_type,
    ),

    primitive_type: _ => choice(
      ...wordTokens(SHADOWABLE_PRIMITIVE_TYPE_WORDS),
      ...wordTokens(SPECIAL_PRIMITIVE_TYPE_WORDS),
    ),

    sized_type_specifier: $ => prec.right(seq(
      repeat1(choice(
        keyword('signed'),
        keyword('unsigned'),
        keyword('short'),
      )),
      optional($.primitive_type),
    )),

    class_type: $ => prec(-1, seq(
      keyword('class'),
      optional(seq('<', $._dottable_type_identifier, '>')),
    )),

    array_type: $ => seq(
      keyword('array'),
      '<',
      field('element', $.type_specifier),
      '>',
    ),

    map_type: $ => seq(
      keyword('map'),
      '<',
      field('key', $.type_specifier),
      ',',
      field('value', $.type_specifier),
      '>',
    ),

    mapiterator_type: $ => seq(
      keyword('mapiterator'),
      '<',
      field('key', $.type_specifier),
      ',',
      field('value', $.type_specifier),
      '>',
    ),

    readonly_type: $ => seq(
      keyword('readonly'),
      '<',
      field('type', referenceTypeIdentifier($)),
      '>',
    ),

    function_type: $ => seq(
      keyword('function'),
      '<',
      choice(
        keyword('void'),
        seq(
          optional($.function_scope),
          $.type_specifier,
          repeat(seq(',', $.type_specifier)),
          '(',
          optional(commaSep($.function_type_parameter)),
          ')',
        ),
      ),
      '>',
    ),

    function_scope: _ => choice(...keywordRules(FUNCTION_SCOPE_WORDS)),

    function_type_parameter: $ => seq(
      optional($.function_parameter_modifiers),
      $.type_specifier,
      optional('&'),
    ),

    function_parameter_modifiers: $ => repeat1(choice(...keywordRules(PARAMETER_MODIFIER_WORDS))),

    // =========================================================================
    // Declarators
    // =========================================================================

    declarator: $ => choice(
      $.pointer_declarator,
      $.function_declarator,
      $.array_declarator,
      $.parenthesized_declarator,
      $.init_declarator,
      $.identifier,
    ),

    pointer_declarator: $ => prec.dynamic(1, prec.right(seq(
      '*',
      field('declarator', $.declarator),
    ))),

    function_declarator: $ => prec(1, seq(
      field('declarator', $.declarator),
      field('parameters', $.parameter_list),
    )),

    array_declarator: $ => prec(1, seq(
      field('declarator', $.declarator),
      '[',
      field('size', optional($.expression)),
      ']',
    )),

    parenthesized_declarator: $ => seq(
      '(',
      $.declarator,
      ')',
    ),

    init_declarator: $ => prec(1, seq(
      field('declarator', choice(
        $.identifier,
        $.array_declarator,
      )),
      '=',
      field('value', choice($.expression, $.initializer_list)),
    )),

    // =========================================================================
    // Parameter list
    // =========================================================================

    parameter_list: $ => seq(
      '(',
      optional(choice(
        keywordWithPrecedence('void', 1),
        commaSep($.parameter_declaration),
      )),
      ')',
    ),

    parameter_declaration: $ => choice(
      '...',
      seq(
        optional($.parameter_modifiers),
        field('type', $.type_specifier),
        optional('&'),
        field('declarator', $.identifier),
        optional(seq('=', field('default', $.expression))),
      ),
    ),

    parameter_modifiers: $ => prec.left(repeat1($.parameter_modifier)),

    parameter_modifier: _ => choice(...keywordRules(PARAMETER_MODIFIER_WORDS)),

    // =========================================================================
    // Statements
    // =========================================================================

    statement: $ => choice(
      $._non_case_statement,
    ),

    _non_case_statement: $ => choice(
      $.labeled_statement,
      $.compound_statement,
      $.expression_statement,
      $.if_statement,
      $.switch_statement,
      $.do_statement,
      $.do_until_statement,
      $.while_statement,
      $.until_statement,
      $.for_statement,
      $.foreach_statement,
      $.return_statement,
      $.break_statement,
      $.continue_statement,
    ),

    labeled_statement: $ => seq(
      field('label', $._statement_identifier),
      ':',
      $.statement,
    ),

    compound_statement: $ => seq(
      '{',
      repeat($._block_item),
      '}',
    ),

    _block_item: $ => choice(
      alias($._local_declaration, $.declaration),
      $.statement,
      $.static_const_array,
    ),

    _local_declaration: $ => choice(
      typedDeclaratorList($.type_specifier, $._variable_declarator),
      $.let_destructuring_declaration,
    ),

    let_destructuring_declaration: $ => seq(
      $._let_keyword,
      field('pattern', $.array_pattern),
      '=',
      field('value', $.expression),
      ';',
    ),

    expression_statement: $ => seq(
      optional($.expression),
      ';',
    ),

    if_statement: $ => prec.right(seq(
      keyword('if'),
      '(',
      field('condition', $.expression),
      ')',
      field('consequence', $.statement),
      optional(field('alternative', $.else_clause)),
    )),

    else_clause: $ => seq(keyword('else'), $.statement),

    switch_statement: $ => seq(
      keyword('switch'),
      '(',
      field('condition', $.expression),
      ')',
      field('body', $.switch_body),
    ),

    switch_body: $ => seq(
      '{',
      repeat($._switch_body_item),
      '}',
    ),

    _switch_body_item: $ => choice(
      $.case_statement,
      $._non_case_statement,
      alias($._local_declaration, $.declaration),
    ),

    case_statement: $ => prec.right(seq(
      choice(
        seq(keyword('case'), field('value', $.expression)),
        keyword('default'),
      ),
      ':',
      repeat(choice($._non_case_statement, alias($._local_declaration, $.declaration))),
    )),

    while_statement: $ => seq(
      keyword('while'),
      '(',
      field('condition', $.expression),
      ')',
      field('body', $.statement),
    ),

    until_statement: $ => seq(
      keyword('until'),
      '(',
      field('condition', $.expression),
      ')',
      field('body', $.statement),
    ),

    do_statement: $ => seq(
      keyword('do'),
      field('body', $.statement),
      keyword('while'),
      '(',
      field('condition', $.expression),
      ')',
      ';',
    ),

    do_until_statement: $ => seq(
      keyword('do'),
      field('body', $.statement),
      keyword('until'),
      '(',
      field('condition', $.expression),
      ')',
      ';',
    ),

    for_statement: $ => seq(
      keyword('for'),
      '(',
      choice(
        field('initializer', alias($._local_declaration, $.declaration)),
        seq(field('initializer', optional($.expression)), ';'),
      ),
      field('condition', optional($.expression)),
      ';',
      field('update', optional($.expression)),
      ')',
      field('body', $.statement),
    ),

    foreach_statement: $ => seq(
      keyword('foreach'),
      '(',
      choice(
        seq(
          field('type', $._type_identifier),
          field('variable', $.identifier),
        ),
        field('variable', $.identifier),
        seq(
          field('variable', $.identifier),
          ',',
          field('variable', $.identifier),
        ),
        seq(
          field('variable', $.identifier),
          ',',
          field('variable', $.identifier),
          ',',
          field('variable', $.identifier),
        ),
      ),
      ':',
      field('collection', $.expression),
      ')',
      field('body', $.statement),
    ),

    return_statement: $ => seq(
      keyword('return'),
      optional(choice(
        $.return_value_list,
        $.expression,
      )),
      ';',
    ),

    return_value_list: $ => choice(
      prec.right(seq(
        $.expression,
        repeat1(seq(',', $.expression)),
      )),
      seq(
        '(',
        commaSep1($.expression),
        optional(','),
        ')',
      ),
    ),

    break_statement: _ => seq(
      keyword('break'),
      ';',
    ),

    continue_statement: _ => seq(
      keyword('continue'),
      ';',
    ),

    // =========================================================================
    // Expressions
    // =========================================================================

    expression: $ => choice(
      $.conditional_expression,
      $.assignment_expression,
      $.binary_expression,
      $.unary_expression,
      $.update_expression,
      $.cast_expression,
      $.pointer_expression,
      $.sizeof_expression,
      $.alignof_expression,
      $.subscript_expression,
      $.call_expression,
      $.field_expression,
      $.super_expression,
      $.identifier,
      $.number_literal,
      $.string_literal,
      $.concatenated_string,
      $.true,
      $.false,
      $.null,
      $.parenthesized_expression,
      $.vector_literal,
      $.random_expression,
      $.name_literal,
    ),

    conditional_expression: $ => prec.right(PREC.CONDITIONAL, seq(
      field('condition', $.expression),
      '?',
      field('consequence', optional($.expression)),
      ':',
      field('alternative', $.expression),
    )),

    _assignment_left_expression: $ => choice(
      $.identifier,
      $.call_expression,
      $.field_expression,
      $.pointer_expression,
      $.subscript_expression,
      $.parenthesized_expression,
      $.array_pattern,
    ),

    // Array destructuring pattern: [a, b] = expr
    array_pattern: $ => seq(
      '[',
      commaSep1($._array_pattern_element),
      ']',
    ),

    _array_pattern_element: $ => choice(
      $.identifier,
      $.dotted_array_pattern_target,
    ),

    dotted_array_pattern_target: _ => token(seq(
      /[a-zA-Z_][a-zA-Z0-9_]*/,
      repeat1(seq('.', /[a-zA-Z_][a-zA-Z0-9_]*/)),
    )),

    assignment_expression: $ => prec.right(PREC.ASSIGNMENT, seq(
      field('left', $._assignment_left_expression),
      field('operator', choice(
        '=',
        '*=',
        '/=',
        '%=',
        '+=',
        '-=',
        '<<=',
        '>>=',
        '>>>=',
        '&=',
        '^=',
        '|=',
      )),
      field('right', $.expression),
    )),

    binary_expression: $ => {
      const table = [
        ['+', PREC.ADD],
        ['-', PREC.ADD],
        ['*', PREC.MULTIPLY],
        ['/', PREC.MULTIPLY],
        ['%', PREC.MULTIPLY],
        ['||', PREC.LOGICAL_OR],
        ['&&', PREC.LOGICAL_AND],
        ['|', PREC.INCLUSIVE_OR],
        ['^', PREC.EXCLUSIVE_OR],
        ['&', PREC.BITWISE_AND],
        ['==', PREC.EQUAL],
        ['!=', PREC.EQUAL],
        ['~==', PREC.EQUAL], // Case-insensitive string comparison
        ['>', PREC.RELATIONAL],
        ['>=', PREC.RELATIONAL],
        ['<=', PREC.RELATIONAL],
        ['<', PREC.RELATIONAL],
        ['<>=', PREC.RELATIONAL], // ZScript three-way comparison
        ['<<', PREC.SHIFT],
        ['>>', PREC.SHIFT],
        ['>>>', PREC.SHIFT], // Unsigned right shift
        ['..', PREC.CONCAT], // String concatenation
        ['is', PREC.RELATIONAL], // Type check
        ['cross', PREC.MULTIPLY], // Vector cross product
        ['dot', PREC.MULTIPLY], // Vector dot product
        ['**', PREC.MULTIPLY], // Power
      ];

      return choice(...table.map(([operator, precedence]) => {
        return prec.left(precedence, seq(
          field('left', $.expression),
          // @ts-ignore
          field('operator', operator),
          field('right', $.expression),
        ));
      }));
    },

    unary_expression: $ => prec.left(PREC.UNARY, seq(
      field('operator', choice('!', '~', '-', '+')),
      field('argument', $.expression),
    )),

    update_expression: $ => {
      const argument = field('argument', $.expression);
      const operator = field('operator', choice('--', '++'));
      return prec.right(PREC.UNARY, choice(
        seq(operator, argument),
        seq(argument, operator),
      ));
    },

    cast_expression: $ => prec(PREC.CAST, seq(
      '(',
      field('type', $.type_specifier),
      ')',
      field('value', $.expression),
    )),

    pointer_expression: $ => prec.left(PREC.CAST, seq(
      field('operator', choice('*', '&')),
      field('argument', $.expression),
    )),

    sizeof_expression: $ => prec(PREC.SIZEOF, seq(
      keyword('sizeof'),
      choice(
        field('value', $.expression),
        seq('(', field('type', $.type_specifier), ')'),
      ),
    )),

    alignof_expression: $ => prec(PREC.SIZEOF, seq(
      keyword('alignof'),
      '(',
      field('type', $.type_specifier),
      ')',
    )),

    subscript_expression: $ => prec(PREC.SUBSCRIPT, seq(
      field('argument', $.expression),
      '[',
      field('index', $.expression),
      ']',
    )),

    call_expression: $ => prec(PREC.CALL, seq(
      field('function', $.expression),
      field('arguments', $.argument_list),
    )),

    argument_list: $ => seq(
      '(',
      commaSep(choice(
        $.expression,
        $.named_argument,
      )),
      ')',
    ),

    named_argument: $ => seq(
      field('name', $.identifier),
      ':',
      field('value', $.expression),
    ),

    field_expression: $ => seq(
      prec(PREC.FIELD, seq(
        field('argument', $.expression),
        field('operator', '.'),
      )),
      field('field', $._field_identifier),
    ),

    parenthesized_expression: $ => prec(PREC.PAREN_DECLARATOR, seq(
      '(',
      $.expression,
      ')',
    )),

    // Vector literal - (x, y) or (x, y, z) or (x, y, z, w)
    vector_literal: $ => seq(
      '(',
      field('x', $.expression),
      ',',
      field('y', $.expression),
      optional(seq(',', field('z', $.expression))),
      optional(seq(',', field('w', $.expression))),
      ')',
    ),

    // =========================================================================
    // ZScript-specific expressions
    // =========================================================================

    // Random expressions - various forms:
    // random(min, max), frandom(min, max) - range
    // random2(mask) - with optional mask
    // randompick(a, b, c, ...), frandompick(a, b, c, ...) - pick from list
    random_expression: $ => prec(PREC.CALL, seq(
      field('function', choice(
        keyword('random'),
        keyword('frandom'),
        keyword('random2'),
        keyword('randompick'),
        keyword('frandompick'),
      )),
      optional(seq('[', field('id', $.identifier), ']')),
      '(',
      optional(commaSep1($.expression)),
      ')',
    )),

    name_literal: _ => seq(
      "'",
      optional(token.immediate(/[^'\n]*/)),
      "'",
    ),

    super_expression: _ => keywordWithPrecedence('super', 1),

    // =========================================================================
    // Initializer list
    // =========================================================================

    initializer_list: $ => seq(
      '{',
      commaSep(choice(
        $.expression,
        $.initializer_list,
      )),
      optional(','),
      '}',
    ),

    // =========================================================================
    // Literals
    // =========================================================================

    number_literal: _ => {
      const separator = "'";
      const hex = /[0-9a-fA-F]/;
      const decimal = /[0-9]/;
      const hexDigits = seq(repeat1(hex), repeat(seq(separator, repeat1(hex))));
      const decimalDigits = seq(repeat1(decimal), repeat(seq(separator, repeat1(decimal))));
      return token(seq(
        optional(/[-+]/),
        choice(
          seq(
            choice(
              decimalDigits,
              seq(/0b/i, /[01]+/),
              seq(/0x/i, hexDigits),
            ),
            optional(seq('.', optional(hexDigits))),
          ),
          seq('.', decimalDigits),
        ),
        optional(seq(
          /[ep]/i,
          optional(/[-+]/),
          hexDigits,
        )),
        /[ulf]*/i,
      ));
    },

    concatenated_string: $ => prec.right(seq(
      $.string_literal,
      repeat1($.string_literal),
    )),

    string_literal: $ => seq(
      '"',
      repeat(choice(
        alias(token.immediate(prec(1, /[^\\"\n]+/)), $.string_content),
        $.escape_sequence,
      )),
      '"',
    ),

    escape_sequence: _ => token.immediate(prec(1, seq(
      '\\',
      choice(
        /[^xuU]/,
        /\d{2,3}/,
        /x[0-9a-fA-F]{1,4}/,
        /u[0-9a-fA-F]{4}/,
        /U[0-9a-fA-F]{8}/,
      ),
    ))),

    true: _ => keyword('true', true),
    false: _ => keyword('false', true),
    null: _ => choice(
      keyword('null', true),
      keyword('nullptr', true),
    ),

    // =========================================================================
    // Identifiers
    // =========================================================================

    identifier: $ => choice(
      $._word_identifier,
      $._shadowable_identifier,
    ),

    _word_identifier: _ => NON_RESERVED_IDENTIFIER_PATTERN,

    _shadowable_identifier: $ => choice(
      ...SHADOWABLE_IDENTIFIER_WORDS.map(word => keywordIdentifier($, word)),
    ),

    _dottable_identifier: $ => choice(
      $.identifier,
      keywordIdentifier($, 'action'),
    ),

    _state_label_segment: $ => choice(
      $.identifier,
      ...STATE_LABEL_KEYWORD_WORDS.map(word => keywordIdentifier($, word)),
    ),

    dottable_name: $ => seq(
      $._dottable_identifier,
      repeat(seq('.', $._dottable_identifier)),
    ),

    _native_type_identifier: $ => seq('@', $.identifier),
    _escaped_type_identifier: $ => seq('.', $.dottable_name),

    _dottable_type_identifier: $ => alias($.dottable_name, $.type_identifier),

    _type_identifier: $ => alias($.identifier, $.type_identifier),
    _field_identifier: $ => alias($.identifier, $.field_identifier),
    _statement_identifier: $ => alias($.identifier, $.statement_identifier),
    _default_keyword: _ => token(prec(-1, wordPattern('default'))),
    _let_keyword: _ => token(prec(-1, wordPattern('let'))),

    // =========================================================================
    // Comments
    // =========================================================================

    comment: _ => token(choice(
      seq('//', /.*/),
      seq(
        '/*',
        /[^*]*\*+([^/*][^*]*\*+)*/,
        '/',
      ),
    )),

  },
});

/**
 * Keywords in ZScript are case-insensitive
 * @param {string} word
 * @returns {RegExp|AliasRule}
 */
function keyword(word, hidden = false) {
  const re = wordPattern(word)
  if (hidden)
    return re
  else
    return alias(re, word)
}

/**
 * Creates a case-insensitive keyword token with explicit lexical precedence.
 * Use this when a keyword would otherwise lose to a longer regex token.
 * @param {string} word
 * @param {number} precedence
 * @returns {AliasRule}
 */
function keywordWithPrecedence(word, precedence) {
  return alias(token(prec(precedence, wordPattern(word))), word)
}

/**
 * Creates a case-insensitive identifier token for reserved words that are
 * accepted in specific identifier positions.
 * @param {*} $
 * @param {string} word
 * @returns {AliasRule}
 */
function keywordIdentifier($, word) {
  return alias(token(prec(-1, wordPattern(word))), $.identifier)
}

function wordToken(word, precedence = -1) {
  return token(prec(precedence, wordPattern(word)));
}

function wordTokens(words, precedence = -1) {
  return words.map(word => wordToken(word, precedence));
}

function keywordRules(words) {
  return words.map(word => keyword(word));
}

/**
 * Creates a case-insensitive word pattern.
 * @param {string} word
 * @returns {RegExp}
 */
function wordPattern(word) {
  return new RegExp(word, 'i')
}

/**
 * Creates a rule to optionally match one or more of the rules separated by a comma
 * @param {Rule} rule
 * @returns {ChoiceRule}
 */
function commaSep(rule) {
  return optional(commaSep1(rule));
}

/**
 * Creates a rule to match one or more of the rules separated by a comma
 * @param {Rule} rule
 * @returns {SeqRule}
 */
function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}

function typedDeclaratorList(typeRule, declaratorRule) {
  return seq(
    field('type', typeRule),
    commaSep1(field('declarator', declaratorRule)),
    ';',
  );
}

function unsafeModifier(word) {
  return seq(
    keyword('unsafe'),
    '(',
    keyword(word),
    ')',
  );
}

function twoSegmentDottableName($) {
  return seq(
    $._dottable_identifier,
    optional(seq('.', $._dottable_identifier)),
  );
}

function referenceTypeIdentifier($) {
  return choice(
    $._type_identifier,
    alias($._native_type_identifier, $.type_identifier),
    alias($._escaped_type_identifier, $.type_identifier),
  );
}

function classHeader($, modifierRule = null) {
  return seq(
    ...(modifierRule ? [modifierRule] : []),
    keyword('class'),
    field('name', $._type_identifier),
    optional($.inheritance_specifier),
    optional($.class_flags),
  );
}

function structDefinition($, modifierRule = null) {
  return seq(
    ...(modifierRule ? [modifierRule] : []),
    keyword('struct'),
    field('name', $._type_identifier),
    optional($.struct_flags),
    '{',
    repeat($._struct_body_item),
    '}',
    optional(';'),
  );
}

function buildExcludedWordPatterns(words, alphabet) {
  return words.flatMap(word =>
    buildExcludedWordPattern(word.toLowerCase(), alphabet).map(pattern => new RegExp(pattern, 'i'))
  );
}

function buildExcludedWordPattern(word, alphabet) {
  return [...word].map((char, index) => `${word.slice(0, index)}${charClass(subtractChars(alphabet, [char]))}${repeatCharClass(alphabet, word.length - index - 1)}`);
}

function repeatCharClass(chars, count) {
  if (count === 0)
    return '';

  const pattern = charClass(chars);
  return count === 1 ? pattern : `${pattern}{${count}}`;
}

function buildIdentifierPattern(reservedWords) {
  const firstChars = [...'abcdefghijklmnopqrstuvwxyz_'];
  const restChars = [...'abcdefghijklmnopqrstuvwxyz0123456789_'];
  const trie = buildWordTrie(reservedWords.map(word => word.toLowerCase()));

  return new RegExp(buildPatternFromTrie(trie, firstChars, restChars), 'i');
}

function buildWordTrie(words) {
  const root = createTrieNode();

  for (const word of words) {
    let node = root;
    for (const char of word) {
      if (!node.children.has(char))
        node.children.set(char, createTrieNode());
      node = node.children.get(char);
    }
    node.terminal = true;
  }

  return root;
}

function createTrieNode() {
  return {
    terminal: false,
    children: new Map(),
  };
}

function buildPatternFromTrie(root, firstChars, restChars) {
  const restTail = `${charClass(restChars)}*`;
  const parts = [];
  const rootChildren = [...root.children.keys()];
  const rootComplement = subtractChars(firstChars, rootChildren);

  if (rootComplement.length > 0)
    parts.push(`${charClass(rootComplement)}${restTail}`);

  for (const char of rootChildren)
    parts.push(`${char}${buildTrieSuffix(root.children.get(char), restChars, restTail)}`);

  return nonCapturingChoice(parts);
}

function buildTrieSuffix(node, alphabet, tailPattern) {
  const parts = [];
  const childChars = [...node.children.keys()];
  const complement = subtractChars(alphabet, childChars);

  if (complement.length > 0)
    parts.push(`${charClass(complement)}${tailPattern}`);

  for (const char of childChars)
    parts.push(`${char}${buildTrieSuffix(node.children.get(char), alphabet, tailPattern)}`);

  if (parts.length === 0)
    return '';

  return node.terminal ? nonCapturingChoice(parts) : `(?:${nonCapturingChoice(parts)})?`;
}

function subtractChars(alphabet, excluded) {
  const excludedSet = new Set(excluded);
  return alphabet.filter(char => !excludedSet.has(char));
}

function charClass(chars) {
  return `[${chars.join('')}]`;
}

function nonCapturingChoice(parts) {
  if (parts.length === 1)
    return parts[0];
  return `(?:${parts.join('|')})`;
}
