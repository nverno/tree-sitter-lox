/// <reference types="tree-sitter-cli/dsl" />
// @ts-check
module.exports = grammar({
  name: 'lox',

  // name of token matching keywords
  word: $ => $.identifier,

  // Tokens that can appear anywhere (comments/whitespace)
  extras: $ => [
    /\s+/,
    $.comment
  ],

  // Replace usages w/ their definitions
  inline: $ => [],

  // LR(1) conflicts
  conflicts: $ => [],

  // token names from custom external scanner
  externals: $ => [],

  // hidden rule names to be considered supertypes in generated node types file
  supertypes: $ => [
    $.statement,
    $.expression,
    $.declaration,
    $.primary_expression,
  ],

  // Parse precedences
  precedences: $ => [
    [
      'member',                                   // .<field>
      'call',                                     // fn()
      'unary',                                    // - +
      'binary_times',                             // * /
      'binary_plus',                              // + -
      'binary_compare',                           // < > <= >=
      'binary_equality',                          // == !=
      'logical_and',                              // %left 'and'
      'logical_or',                               // %left 'or'
      'assign',                                   // =
      // $.sequence_expression,                   // %left ... , ...
    ],
    ['assign', $.primary_expression],
    ['member', 'call', $.expression],
  ],

  rules: {
    program: $ => repeat(choice($.declaration)),

    // -------------------------------------------------------------------
    /// Declarations 

    declaration: $ => choice(
      $.class_declaration,
      $.variable_declaration,
      $.function_declaration,
      $.statement,
    ),

    class_declaration: $ => seq(
      'class',
      field('name', $.identifier),
      optional(field('superclass', $.superclass)),
      field('body', $.class_body),
    ),

    superclass: $ => seq('<', $.identifier),

    class_body: $ => seq(
      '{',
      repeat(alias($._function_definition, $.method_definition)),
      '}'
    ),

    function_declaration: $ => seq('fun', $._function_definition),

    _function_definition: $ => seq(
      field('name', $.identifier),
      field('parameters', $.parameter_list),
      field('body', $.compound_statement),
    ),

    parameter_list: $ => seq('(', commaSep($.identifier), ')'),

    variable_declaration: $ => seq(
      'var',
      field('name', $.identifier),
      optional(seq('=', field('value', $.expression))),
      ';'
    ),

    // ---------------------------------------------------------------
    /// Statements

    statement: $ => choice(
      $.expression_statement,
      $.if_statement,
      $.for_statement,
      $.while_statement,
      $.print_statement,
      $.return_statement,
      $.compound_statement,
    ),

    compound_statement: $ => seq('{', repeat($.declaration), '}'),

    expression_statement: $ => seq($.expression, ';'),

    print_statement: $ => seq('print', $.expression, ';'),

    return_statement: $ => seq('return', optional($.expression), ';'),

    while_statement: $ => seq(
      'while',
      field('condition', $.parenthesized_expression),
      field('body', $.statement),
    ),

    if_statement: $ => prec.right(seq(
      'if',
      field('condition', $.parenthesized_expression),
      field('consequence', $.statement),
      optional(field('alternative', $.else_clause)),
    )),

    else_clause: $ => seq('else', $.statement),

    for_statement: $ => seq(
      'for',
      $.for_clause,
      field('body', $.statement),
    ),

    for_clause: $ => seq(
      '(',
      choice(
        ';',
        field('initializer',
          choice(
            $.variable_declaration,
            $.expression_statement
          )),
      ),
      optional(field('condition', $.expression)), ';',
      optional(field('update', $.expression)),
      ')',
    ),

    // ---------------------------------------------------------------
    /// Expressions

    expression: $ => choice(
      $.primary_expression,
      $.unary_expression,
      $.binary_expression,
    ),

    primary_expression: $ => choice(
      $.number,
      $.string,
      alias("this", $.this),
      alias("false", $.false),
      alias("true", $.true),
      alias("nil", $.nil),
      $.identifier,
      $.member_expression,
      $.parenthesized_expression,
      $.call_expression,
      $.super_expression,
    ),

    unary_expression: $ => prec.left('unary', seq(
      field('operator', choice('-', '!')),
      field('argument', $.expression),
    )),

    binary_expression: $ => choice(...[
      ['and', 'logical_and'],
      ['or', 'logical_or'],
      ['+', 'binary_plus'],
      ['-', 'binary_plus'],
      ['*', 'binary_times'],
      ['/', 'binary_times'],
      ['<', 'binary_compare'],
      ['>', 'binary_compare'],
      ['>=', 'binary_compare'],
      ['<=', 'binary_compare'],
      ['==', 'binary_equality'],
      ['!=', 'binary_equality'],
      ['=', 'assign', 'right']
    ].map(([operator, precedence, assoc]) =>
      (assoc === 'right' ? prec.right : prec.left)(precedence, seq(
        field('left', $.expression),
        field('operator', operator),
        field('right', $.expression),
      ))
    )),

    parenthesized_expression: $ => seq('(', $.expression, ')'),

    // sequence_expression: $ => seq(
    //   field('left', $.expression),
    //   ",",
    //   field('right', choice($.sequence_expression, $.expression)),
    // ),

    super_expression: $ => prec('member', seq(
      'super', token('.'), $.identifier,
    )),

    call_expression: $ => prec('call', seq(
      field('function', $.primary_expression),
      field('arguments', $.argument_list),
    )),

    argument_list: $ => seq('(', commaSep($.expression), ')'),

    member_expression: $ => prec('member', seq(
      field('object', $.primary_expression),
      '.',
      field('property', $.identifier),
    )),

    // field: $ => seq('.', field('name', $.identifier)),

    string: $ => seq('"', /[^"]*/, '"'),

    number: $ => /[+-]?([0-9]+(\.[0-9]*)?|\.[0-9]+)/,

    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    comment: $ => /\/\/.*/,
  }
});

function sep1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}

function commaSep(rule) {
  return optional(sep1(rule, ','));
}
