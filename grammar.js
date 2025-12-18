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

module.exports = grammar({
  name: "zscript",

  conflicts: $ => [
    [$.type_specifier, $.expression],
    [$.method_definition, $.type_specifier],
    [$.type_qualifier, $.parameter_modifier],
    [$.method_definition, $._declarator],
    [$.vector_literal],
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
    $._declarator,
  ],

  word: $ => $.identifier,

  rules: {
    source_file: $ => repeat($._top_level_item),

    _top_level_item: $ => choice(
      $.class_definition,
      $.struct_definition,
      $.enum_definition,
      $.const_definition,
      $.include_directive,
      $.version_directive,
      $.function_definition,
      $.declaration,
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
      optional($.class_modifier),
      keyword('class'),
      field('name', $._type_identifier),
      optional($.inheritance_specifier),
      optional($.class_flags),
      '{',
      repeat($._class_body_item),
      '}',
    )),

    class_modifier: _ => choice(
      keyword('extend'),
      keyword('mixin'),
    ),

    inheritance_specifier: $ => seq(
      ':',
      field('parent', $._type_identifier),
    ),

    class_flags: $ => repeat1($.class_flag),

    class_flag: $ => choice(
      keyword('abstract'),
      keyword('play'),
      keyword('ui'),
      keyword('clearscope'),
      keyword('native'),
      keyword('replaces'),
      seq(keyword('replaces'), $._type_identifier),
      seq(keyword('version'), '(', $.string_literal, ')'),
    ),

    // =========================================================================
    // Struct definition
    // =========================================================================

    struct_definition: $ => seq(
      optional(keyword('extend')),
      keyword('struct'),
      field('name', $._type_identifier),
      optional($.struct_flags),
      '{',
      repeat($._struct_body_item),
      '}',
      optional(';'),
    ),

    struct_flags: $ => repeat1($.struct_flag),

    struct_flag: $ => choice(
      keyword('play'),
      keyword('ui'),
      keyword('clearscope'),
      keyword('native'),
      seq(keyword('version'), '(', $.string_literal, ')'),
    ),

    _struct_body_item: $ => choice(
      $.field_declaration,
      $.method_definition,
      $.const_definition,
      $.enum_definition,
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
      $.type_specifier,
    ),

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
      $.field_declaration,
      $.method_definition,
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
      field('type', $.type_specifier),
      commaSep1(field('declarator', $._declarator)),
      ';',
    ),

    member_modifiers: $ => prec.left(repeat1($.member_modifier)),

    member_modifier: $ => choice(
      keyword('native'),
      keyword('meta'),
      keyword('transient'),
      keyword('readonly'),
      keyword('private'),
      keyword('protected'),
      keyword('deprecated'),
      keyword('internal'),
      keyword('latent'),
      keyword('final'),
      keyword('static'),
      keyword('play'),
      keyword('ui'),
      keyword('clearscope'),
      keyword('action'),
      keyword('override'),
      keyword('virtual'),
      keyword('vararg'),
      seq(keyword('version'), '(', $.string_literal, ')'),
      seq('(', commaSep($.identifier), ')'), // action qualifiers like (actor caller)
    ),

    // =========================================================================
    // Method definition
    // =========================================================================

    method_definition: $ => seq(
      optional($.member_modifiers),
      field('type', optional($.type_specifier)),
      field('name', $.identifier),
      field('parameters', $.parameter_list),
      optional($.const_qualifier),
      choice(
        field('body', $.compound_statement),
        ';',
      ),
    ),

    const_qualifier: _ => keyword('const'),

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
      field('name', $.identifier),
      '[',
      ']',
      '=',
      $.initializer_list,
      ';',
    ),

    // =========================================================================
    // Default block
    // =========================================================================

    default_block: $ => seq(
      keyword('default'),
      '{',
      repeat($.default_property),
      '}',
    ),

    default_property: $ => choice(
      $.property_assignment,
      $.flag_statement,
    ),

    property_assignment: $ => seq(
      field('property', $.property_identifier),
      optional(field('value', commaSep1($.expression))),
      ';',
    ),

    property_identifier: $ => seq(
      $.identifier,
      optional(seq('.', $.identifier)),
    ),

    flag_statement: $ => seq(
      field('sign', choice('+', '-')),
      field('flag', $.flag_name),
      ';',
    ),

    flag_name: $ => seq(
      $.identifier,
      optional(seq('.', $.identifier)),
    ),

    // =========================================================================
    // States block
    // =========================================================================

    states_block: $ => seq(
      keyword('states'),
      optional($.states_options),
      '{',
      repeat($._states_body_item),
      '}',
    ),

    states_options: $ => seq(
      '(',
      commaSep($.identifier),
      ')',
    ),

    _states_body_item: $ => choice(
      $.state_label,
      $.state_line,
      $.state_flow,
    ),

    state_label: $ => seq(
      field('name', $.state_label_name),
      ':',
    ),

    state_label_name: $ => seq(
      $.identifier,
      repeat(seq('.', $.identifier)),
    ),

    state_line: $ => prec.right(seq(
      field('sprite', $.state_sprite),
      field('frames', $.state_frames),
      field('duration', $._state_duration),
      optional($.state_modifiers),
      optional($.state_action),
      optional(';'),
    )),

    // State sprite - matches (longer patterns first):
    // - "####" quoted previous sprite (6 chars)
    // - "XXXX" quoted sprite name (6 chars)
    // - #### for previous sprite (4 chars)
    // - 4 uppercase chars: PLAY, TNT1, etc. (4 chars)
    state_sprite: _ => /"####"|"[A-Z0-9_]{4}"|####|[A-Z0-9_]{4}/,

    state_frames: _ => /[A-Z0-9\[\]\\#]+/,

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
      keyword('nodelay'),
      keyword('canraise'),
      seq(keyword('light'), '(', commaSep1($.string_literal), ')'),
      seq(keyword('offset'), '(', $.expression, ',', $.expression, ')'),
    ),

    state_action: $ => choice(
      $.state_action_call,
      $.compound_statement,
    ),

    state_action_call: $ => seq(
      field('function', $.identifier),
      optional(field('arguments', $.argument_list)),
    ),

    state_flow: $ => choice(
      seq(keyword('loop'), optional(';')),
      seq(keyword('stop'), optional(';')),
      seq(keyword('wait'), optional(';')),
      seq(keyword('fail'), optional(';')),
      seq(keyword('goto'), field('target', $.state_goto_target), optional(';')),
    ),

    state_goto_target: $ => seq(
      optional(seq(field('class', $._type_identifier), '::')),
      $.state_label_name,
      optional(seq('+', $.number_literal)),
    ),

    // =========================================================================
    // Function definition (outside class)
    // =========================================================================

    function_definition: $ => seq(
      $._declaration_specifiers,
      field('declarator', $.function_declarator),
      field('body', $.compound_statement),
    ),

    // =========================================================================
    // Declaration specifiers
    // =========================================================================

    _declaration_modifiers: $ => choice(
      $.storage_class_specifier,
      $.type_qualifier,
    ),

    _declaration_specifiers: $ => prec.right(seq(
      repeat($._declaration_modifiers),
      field('type', $.type_specifier),
      repeat($._declaration_modifiers),
    )),

    storage_class_specifier: _ => choice(
      keyword('static'),
      keyword('extern'),
    ),

    type_qualifier: _ => choice(
      keyword('const'),
      keyword('in'),
      keyword('out'),
    ),

    // =========================================================================
    // Type specifiers
    // =========================================================================

    type_specifier: $ => choice(
      $.primitive_type,
      $.sized_type_specifier,
      $.class_type,
      $.array_type,
      $.map_type,
      $.mapiterator_type,
      $._type_identifier,
      $.readonly_type,
    ),

    primitive_type: _ => choice(
      keyword('void'),
      keyword('bool'),
      keyword('int'),
      keyword('uint'),
      keyword('float'),
      keyword('double'),
      keyword('string'),
      keyword('name'),
      keyword('sound'),
      keyword('color'),
      keyword('vector2'),
      keyword('vector3'),
      keyword('vector4'),
      keyword('state'),
      keyword('statelabel'),
      keyword('spriteid'),
      keyword('textureid'),
      keyword('voidptr'),
      keyword('int8'),
      keyword('int16'),
      keyword('uint8'),
      keyword('uint16'),
      keyword('let'),
      keyword('var'),
    ),

    sized_type_specifier: $ => seq(
      repeat1(choice(
        keyword('signed'),
        keyword('unsigned'),
        keyword('short'),
        keyword('long'),
      )),
      optional($.primitive_type),
    ),

    class_type: $ => prec(-1, seq(
      keyword('class'),
      optional(seq('<', $._type_identifier, '>')),
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
      field('type', $.type_specifier),
      '>',
    ),

    // =========================================================================
    // Declarators
    // =========================================================================

    _declarator: $ => choice(
      $.pointer_declarator,
      $.function_declarator,
      $.array_declarator,
      $.parenthesized_declarator,
      $.init_declarator,
      $.identifier,
    ),

    pointer_declarator: $ => prec.dynamic(1, prec.right(seq(
      '*',
      field('declarator', $._declarator),
    ))),

    function_declarator: $ => prec(1, seq(
      field('declarator', $._declarator),
      field('parameters', $.parameter_list),
    )),

    array_declarator: $ => prec(1, seq(
      field('declarator', $._declarator),
      '[',
      field('size', optional($.expression)),
      ']',
    )),

    parenthesized_declarator: $ => seq(
      '(',
      $._declarator,
      ')',
    ),

    init_declarator: $ => prec(1, seq(
      field('declarator', $.identifier),
      '=',
      field('value', choice($.expression, $.initializer_list)),
    )),

    // =========================================================================
    // Parameter list
    // =========================================================================

    parameter_list: $ => seq(
      '(',
      optional(commaSep($.parameter_declaration)),
      ')',
    ),

    parameter_declaration: $ => choice(
      seq(
        optional($.parameter_modifiers),
        $._declaration_specifiers,
        optional(field('declarator', $._declarator)),
        optional(seq('=', field('default', $.expression))),
      ),
      '...',
    ),

    parameter_modifiers: $ => prec.left(repeat1($.parameter_modifier)),

    parameter_modifier: _ => choice(
      keyword('in'),
      keyword('out'),
    ),

    // =========================================================================
    // Statements
    // =========================================================================

    statement: $ => choice(
      $.case_statement,
      $._non_case_statement,
    ),

    _non_case_statement: $ => choice(
      $.labeled_statement,
      $.compound_statement,
      $.expression_statement,
      $.if_statement,
      $.switch_statement,
      $.do_statement,
      $.while_statement,
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
      $.declaration,
      $.statement,
    ),

    declaration: $ => seq(
      $._declaration_specifiers,
      commaSep1(field('declarator', $._declarator)),
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
      field('body', $.compound_statement),
    ),

    case_statement: $ => prec.right(seq(
      choice(
        seq(keyword('case'), field('value', $.expression)),
        keyword('default'),
      ),
      ':',
      repeat(choice($._non_case_statement, $.declaration)),
    )),

    while_statement: $ => seq(
      keyword('while'),
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

    for_statement: $ => seq(
      keyword('for'),
      '(',
      choice(
        field('initializer', $.declaration),
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
      field('variable', $.identifier),
      ':',
      field('collection', $.expression),
      ')',
      field('body', $.statement),
    ),

    return_statement: $ => seq(
      keyword('return'),
      optional($.expression),
      ';',
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
      $.getclass_expression,
      $.name_literal,
      $.super_expression,
      $.self_expression,
      $.invoker_expression,
      $.state_expression,
      $.type_member_expression,
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
      commaSep1($.identifier),
      ']',
    ),

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

    getclass_expression: _ => prec(PREC.CALL, seq(
      keyword('getclass'),
      '(',
      ')',
    )),

    name_literal: _ => seq(
      "'",
      optional(token.immediate(/[^'\n]*/)),
      "'",
    ),

    super_expression: _ => keyword('super'),

    self_expression: _ => keyword('self'),

    invoker_expression: _ => keyword('invoker'),

    state_expression: $ => prec(PREC.CALL, seq(
      keyword('resolvestate'),
      '(',
      field('state', choice($.string_literal, $.null)),
      ')',
    )),

    // Type member access - for accessing static members like Double.NaN, Float.Infinity
    // Limited to specific types to avoid conflicts with identifier expressions
    type_member_expression: $ => prec(PREC.FIELD, seq(
      field('type', choice(
        keyword('double'),
        keyword('float'),
      )),
      '.',
      field('member', $._field_identifier),
    )),

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
    null: _ => keyword('null', true),

    // =========================================================================
    // Identifiers
    // =========================================================================

    identifier: _ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    _type_identifier: $ => alias($.identifier, $.type_identifier),
    _field_identifier: $ => alias($.identifier, $.field_identifier),
    _statement_identifier: $ => alias($.identifier, $.statement_identifier),

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

    // Special flags for state visibility (like $Category, $Sprite in comments)
    editor_comment: _ => seq(
      '//',
      /\$[^\n]*/,
    ),
  },
});

/**
 * Keywords in ZScript are case-insensitive
 * @param {string} word
 * @returns {RegExp|AliasRule}
 */
function keyword(word, hidden = false) {
  const re = new RegExp(word, 'i')
  if (hidden)
    return re
  else
    return alias(re, word)
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
