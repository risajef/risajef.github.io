import { parser as pythonParser } from '@lezer/python'

export class PythonImportError extends Error {
  constructor(message, lineNumber = null) {
    super(lineNumber ? `Line ${lineNumber}: ${message}` : message)
    this.name = 'PythonImportError'
    this.lineNumber = lineNumber
  }
}

export function parsePythonToBlocks(source) {
  const normalizedSource = normalizeSource(source)
  let tree = null

  try {
    throwIfLikelyWrongLanguage(normalizedSource)
    tree = pythonParser.parse(normalizedSource)
    throwOnParseErrors(tree, normalizedSource)
    return mapBody(tree.topNode, normalizedSource)
  } catch (error) {
    logImportDiagnostics(error, {
      source,
      normalizedSource,
      tree,
    })
    if (error instanceof PythonImportError) {
      throw error
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new PythonImportError(message)
  }
}

function throwIfLikelyWrongLanguage(source) {
  const detection = detectLikelyWrongLanguage(source)
  if (!detection) return
  throw new PythonImportError(detection.message, detection.lineNumber)
}

function detectLikelyWrongLanguage(source) {
  const lines = source.split('\n')
  const firstContentLineIndex = lines.findIndex((line) => line.trim())
  if (firstContentLineIndex === -1) return null

  const firstLine = lines[firstContentLineIndex].trim()
  const sample = lines.slice(0, 30).join('\n')
  const powerShellSignals = [
    /\bAdd-Type\b/,
    /\bJoin-Path\b/,
    /\bStart-Process\b/,
    /\bOut-Null\b/,
    /\bImport-PowerShellDataFile\b/,
    /\bWhere-Object\b/,
    /\bForEach-Object\b/,
    /\$[A-Za-z_][\w.]*/,
    /\[[A-Za-z][\w.]+\]::/,
    /-eq\b|-match\b|-replace\b|-not\b|-gt\b|-lt\b/,
  ]

  const signalCount = powerShellSignals.reduce((count, pattern) => count + (pattern.test(sample) ? 1 : 0), 0)
  if (signalCount >= 2 || /^\$[A-Za-z_]/.test(firstLine) || /^Add-Type\b/.test(firstLine)) {
    return {
      lineNumber: firstContentLineIndex + 1,
      message: 'This looks like PowerShell, not Python. Paste Python code into the Python Blocks importer.',
    }
  }

  return null
}

function normalizeSource(source) {
  const text = source.replace(/\r\n?/g, '\n')
  const lines = text.split('\n')
  const indentedLines = lines.filter((line) => line.trim())
  const commonIndent = indentedLines.reduce((minIndent, line) => {
    const match = line.match(/^[ \t]*/)
    const indent = (match?.[0] || '').replace(/\t/g, '    ').length
    return minIndent === null ? indent : Math.min(minIndent, indent)
  }, null)

  if (!commonIndent) {
    return text
  }

  return lines.map((line) => {
    if (!line.trim()) {
      return ''
    }
    let remaining = commonIndent
    let index = 0
    while (remaining > 0 && index < line.length) {
      if (line[index] === '\t') {
        remaining -= 4
      } else if (line[index] === ' ') {
        remaining -= 1
      } else {
        break
      }
      index += 1
    }
    return line.slice(index)
  }).join('\n')
}

function logImportDiagnostics(error, { source, normalizedSource, tree }) {
  if (typeof console === 'undefined') {
    return
  }

  const normalizedChanged = source !== normalizedSource
  const errorMessage = error instanceof Error ? error.message : String(error)
  const lineNumber = error instanceof PythonImportError ? error.lineNumber : null
  const lineText = lineNumber ? normalizedSource.split('\n')[lineNumber - 1] ?? '' : ''
  const topLevelNodes = tree?.topNode ? childNodes(tree.topNode).map((node) => node.name) : []

  console.groupCollapsed('[Python Blocks import] diagnostics')
  console.error('Import failed:', errorMessage)
  if (error instanceof Error && error.stack) {
    console.error(error.stack)
  }
  console.log('Line number:', lineNumber)
  console.log('Failing line:', lineText)
  console.log('Original source:\n' + source)
  if (normalizedChanged) {
    console.log('Normalized source:\n' + normalizedSource)
  }
  if (tree) {
    console.log('Top-level node names:', topLevelNodes)
    console.log('Parse tree:', tree.toString())
  }
  console.groupEnd()
}

function throwOnParseErrors(tree, source) {
  let firstError = null
  tree.iterate({
    enter(node) {
      if (node.type.isError) {
        if (isRecoverableStringParseError(tree, node)) {
          return undefined
        }
        firstError = node
        return false
      }
      return undefined
    },
  })

  if (firstError) {
    const languageMismatch = detectLikelyWrongLanguage(source)
    if (languageMismatch) {
      throw new PythonImportError(languageMismatch.message, languageMismatch.lineNumber)
    }
    const snippet = source.slice(firstError.from, Math.min(source.length, firstError.to + 16)).trim()
    throw new PythonImportError(
      snippet ? `Could not parse the full program near "${snippet}".` : 'Could not parse the full program.',
      lineNumberAt(source, firstError.from),
    )
  }
}

function isRecoverableStringParseError(tree, errorNode) {
  const candidatePositions = [
    errorNode.from,
    Math.max(0, errorNode.from - 1),
    Math.max(0, errorNode.to - 1),
  ]

  return candidatePositions.some((position) => hasStringLikeAncestor(tree, position))
}

const STRING_LIKE_NODE_NAMES = new Set(['String', 'ContinuedString', 'FormatString'])

function hasStringLikeAncestor(tree, position) {
  if (typeof tree.resolve !== 'function') {
    return false
  }

  let current = tree.resolve(position, 1)
  while (current) {
    if (STRING_LIKE_NODE_NAMES.has(current.name)) {
      return true
    }
    current = current.parent
  }

  return false
}

function mapBody(node, source) {
  const result = []
  const nodes = node.name === 'Body' ? bodyContentNodes(node) : childNodes(node)

  for (const child of nodes) {
    const mapped = mapTopLevelNode(child, source)
    if (!mapped) continue
    if (Array.isArray(mapped)) {
      result.push(...mapped)
    } else {
      result.push(mapped)
    }
  }

  return result
}

function mapTopLevelNode(node, source) {
  if (isStructuralNoise(node)) {
    return null
  }

  if (node.name === 'Comment') {
    return {
      type: 'commentStmt',
      value: source.slice(node.from, node.to).replace(/^#\s?/, ''),
    }
  }

  if (node.name === 'Script' || node.name === 'Body' || node.name === 'StatementGroup') {
    return mapBody(node, source)
  }

  const relevantChildren = childNodes(node).filter((child) => !isStructuralNoise(child))
  if (relevantChildren.length === 1 && shouldUnwrap(node)) {
    return mapTopLevelNode(relevantChildren[0], source)
  }

  return mapStatement(node, source)
}

function mapStatement(node, source) {
  switch (node.name) {
    case 'DecoratedStatement':
      return mapDecoratedStatement(node, source)
    case 'AssignStatement':
      return mapAssignStatement(node, source)
    case 'UpdateStatement':
      return mapUpdateStatement(node, source)
    case 'ImportStatement':
      return mapImportStatement(node, source)
    case 'PrintStatement':
      return mapPrintStatement(node, source)
    case 'WhileStatement':
      return mapWhileStatement(node, source)
    case 'IfStatement':
      return mapIfStatement(node, source)
    case 'ForStatement':
      return mapForStatement(node, source)
    case 'FunctionDefinition':
      return mapFunctionDefinition(node, source)
    case 'ClassDefinition':
      return mapClassDefinition(node, source)
    case 'RaiseStatement':
      return mapRaiseStatement(node, source)
    case 'WithStatement':
      return mapWithStatement(node, source)
    case 'MatchStatement':
      return mapMatchStatement(node, source)
    case 'ReturnStatement':
      return mapReturnStatement(node, source)
    case 'YieldStatement':
      return mapYieldStatement(node, source)
    case 'TryStatement':
      return mapTryStatement(node, source)
    case 'BreakStatement':
      return { type: 'break' }
    case 'ContinueStatement':
      return { type: 'continue' }
    case 'PassStatement':
      return null
    case 'ExpressionStatement':
      return mapExpressionStatement(node, source)
    default:
      return mapRawStatement(node, source)
  }
}

function mapDecoratedStatement(node, source) {
  const decorators = directNamedChildren(node, 'Decorator').map((decoratorNode) => ({
    type: 'decoratorStmt',
    value: source.slice(decoratorNode.from, decoratorNode.to).replace(/^@/, '').trim(),
  }))

  const targetNode = childNodes(node).find((child) => !isStructuralNoise(child) && child.name !== 'Decorator')
  if (!targetNode) {
    throw new PythonImportError('Invalid decorated statement.', lineNumberAt(source, node.from))
  }

  const mappedTarget = mapStatement(targetNode, source)
  return decorators.concat(mappedTarget)
}

function mapAssignStatement(node, source) {
  const typeDefNode = directNamedChild(node, 'TypeDef')
  if (typeDefNode) {
    return mapAnnotatedAssignStatement(node, source, typeDefNode)
  }

  const expressions = directExpressionChildren(node)
  if (expressions.length < 2) {
    throw new PythonImportError('Only single-target assignments are supported.', lineNumberAt(source, node.from))
  }

  const { targetNode, valueNode } = splitAssignmentTargets(node, expressions, source)
  const target = mapAssignmentTarget(targetNode, source)
  const value = mapExpression(valueNode, source)

  if (value.type === 'callExpr' && value.name === 'input') {
    if (value.args.length > 1) {
      throw new PythonImportError('input(...) supports at most one prompt argument.', lineNumberAt(source, node.from))
    }
    return {
      type: 'input',
      slots: {
        target,
        prompt: value.args[0] ?? { type: 'str', value: '' },
      },
    }
  }

  return {
    type: 'assign',
    slots: { target, value },
  }
}

function mapAnnotatedAssignStatement(node, source, typeDefNode) {
  const expressions = directExpressionChildren(node)
  if (expressions.length < 1 || expressions.length > 2) {
    throw new PythonImportError('Unsupported annotated assignment.', lineNumberAt(source, node.from))
  }

  const annotation = source.slice(typeDefNode.from, typeDefNode.to).replace(/^:\s*/, '').trim()
  if (!annotation) {
    throw new PythonImportError('Expected a type annotation.', lineNumberAt(source, typeDefNode.from))
  }

  return {
    type: 'annAssign',
    annotation,
    slots: {
      target: mapAssignmentTarget(expressions[0], source),
      value: expressions[1] ? mapExpression(expressions[1], source) : null,
    },
  }
}

function splitAssignmentTargets(node, expressions, source) {
  const separators = []
  for (let i = 0; i < expressions.length - 1; i += 1) {
    separators.push(source.slice(expressions[i].to, expressions[i + 1].from))
  }

  const assignmentIndices = separators
    .map((separator, index) => separator.includes('=') ? index : -1)
    .filter((index) => index >= 0)

  if (assignmentIndices.length !== 1) {
    throw new PythonImportError('Only single-target assignments are supported.', lineNumberAt(source, node.from))
  }

  const assignmentIndex = assignmentIndices[0]
  const targetExpressions = expressions.slice(0, assignmentIndex + 1)
  const valueExpressions = expressions.slice(assignmentIndex + 1)
  const targetSeparators = separators.slice(0, assignmentIndex)
  const valueSeparators = separators.slice(assignmentIndex + 1)

  const targetNode = buildTupleLikeNode(targetExpressions, targetSeparators)
  const valueNode = buildTupleLikeNode(valueExpressions, valueSeparators)

  if (targetNode && valueNode) {
    return { targetNode, valueNode }
  }

  throw new PythonImportError('Only single-target assignments are supported.', lineNumberAt(source, node.from))
}

function buildTupleLikeNode(items, separators) {
  if (!items.length) {
    return null
  }

  if (items.length === 1) {
    return items[0]
  }

  if (!separators.every((separator) => separator.includes(','))) {
    return null
  }

  return {
    type: 'tuple',
    items,
    from: items[0].from,
    to: items[items.length - 1].to,
  }
}

function mapAssignmentTarget(targetNode, source) {
  if (targetNode.type === 'tuple') {
    return {
      type: 'tupleExpr',
      args: targetNode.items.map((item) => mapAssignmentTarget(item, source)),
    }
  }

  return mapExpression(targetNode, source)
}

function mapUpdateStatement(node, source) {
  const expressions = directExpressionChildren(node)
  if (expressions.length !== 2) {
    throw new PythonImportError('Unsupported augmented assignment.', lineNumberAt(source, node.from))
  }

  const operator = source.slice(expressions[0].to, expressions[1].from).trim().replace(/=$/, '')
  if (!['+', '-', '*', '/'].includes(operator)) {
    throw new PythonImportError(`Unsupported augmented assignment operator "${operator}".`, lineNumberAt(source, node.from))
  }

  return {
    type: 'augAssign',
    op: operator,
    slots: {
      target: mapExpression(expressions[0], source),
      value: mapExpression(expressions[1], source),
    },
  }
}

function mapImportStatement(node, source) {
  const text = source.slice(node.from, node.to).trim()

  if (text.startsWith('import ')) {
    const items = splitTopLevel(text.slice(7), ',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const match = part.match(/^([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)(?:\s+as\s+([A-Za-z_]\w*))?$/)
        if (!match) {
          throw new PythonImportError('Invalid import statement.', lineNumberAt(source, node.from))
        }
        return {
          type: 'importStmt',
          alias: match[2] || '',
          slots: {
            module: dottedNameToExpr(match[1]),
          },
        }
      })

    return items.length === 1 ? items[0] : items
  }

  const match = text.match(/^from\s+([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\s+import\s+(.+)$/)
  if (!match) {
    throw new PythonImportError('Invalid from-import statement.', lineNumberAt(source, node.from))
  }

  const importItems = splitTopLevel(match[2], ',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const itemMatch = part.match(/^([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)(?:\s+as\s+([A-Za-z_]\w*))?$/)
      if (!itemMatch) {
        throw new PythonImportError('Invalid from-import item.', lineNumberAt(source, node.from))
      }
      return {
        expr: dottedNameToExpr(itemMatch[1]),
        alias: itemMatch[2] || '',
      }
    })

  if (!importItems.length) {
    throw new PythonImportError('Expected at least one imported name.', lineNumberAt(source, node.from))
  }

  return {
    type: 'fromImportStmt',
    alias: importItems[0].alias,
    args: importItems.slice(1).map((item) => item.expr),
    importAliases: importItems.slice(1).map((item) => item.alias),
    slots: {
      module: dottedNameToExpr(match[1]),
      name: importItems[0].expr,
    },
  }
}

function mapPrintStatement(node, source) {
  const expressions = directExpressionChildren(node)
  if (expressions.length !== 1) {
    throw new PythonImportError('print(...) currently supports exactly one argument.', lineNumberAt(source, node.from))
  }
  return {
    type: 'print',
    slots: {
      value: mapExpression(expressions[0], source),
    },
  }
}

function mapWhileStatement(node, source) {
  if (directNamedChild(node, 'elseClause')) {
    throw new PythonImportError('while ... else is not supported.', lineNumberAt(source, node.from))
  }

  const bodyNode = node.getChild('Body')
  const conditionNode = directExpressionChildren(node).find((child) => !bodyNode || child.to <= bodyNode.from)

  if (!bodyNode || !conditionNode) {
    throw new PythonImportError('Invalid while statement.', lineNumberAt(source, node.from))
  }

  return {
    type: 'while',
    slots: {
      condition: mapExpression(conditionNode, source),
    },
    body: mapBody(bodyNode, source),
  }
}

function mapIfStatement(node, source) {
  const bodyNodes = directNamedChildren(node, 'Body')
  if (!bodyNodes.length) {
    throw new PythonImportError('Invalid if statement.', lineNumberAt(source, node.from))
  }

  let cursor = node.from
  const clauses = []
  let elseBody = []

  for (const bodyNode of bodyNodes) {
    const header = source.slice(cursor, bodyNode.from).trim()
    if (/^(if|elif)\b/.test(header)) {
      const conditionText = header.replace(/^(if|elif)\s+/, '').replace(/:\s*$/, '').trim()
      clauses.push({
        condition: parsePythonExpression(conditionText, source, bodyNode.from),
        body: mapBody(bodyNode, source),
      })
    } else if (/^else\b/.test(header)) {
      elseBody = mapBody(bodyNode, source)
    } else {
      throw new PythonImportError('Invalid if statement.', lineNumberAt(source, bodyNode.from))
    }
    cursor = bodyNode.to
  }

  if (!clauses.length) {
    throw new PythonImportError('Invalid if statement.', lineNumberAt(source, node.from))
  }

  let current = null
  for (let index = clauses.length - 1; index >= 0; index -= 1) {
    current = {
      type: 'if',
      slots: {
        condition: clauses[index].condition,
      },
      body: clauses[index].body,
      elseBody,
    }
    elseBody = [current]
  }

  return current
}

function mapForStatement(node, source) {
  if (directNamedChild(node, 'elseClause')) {
    throw new PythonImportError('for ... else is not supported.', lineNumberAt(source, node.from))
  }

  const bodyNode = node.getChild('Body')
  const expressions = directExpressionChildren(node).filter((child) => !bodyNode || child.to <= bodyNode.from)
  const { targetNode, iterableNode } = splitForTargetAndIterable(node, expressions, source)
  const variable = mapAssignmentTarget(targetNode, source)
  const iterable = mapExpression(iterableNode, source)

  if (iterable.type !== 'callExpr' || iterable.name !== 'range') {
    return {
      type: 'for',
      slots: {
        var: variable,
        start: null,
        end: null,
        iterable,
      },
      body: mapBody(bodyNode, source),
    }
  }

  const rangeArgs = Array.isArray(iterable.args) ? iterable.args : []
  if (rangeArgs.length < 1 || rangeArgs.length > 2) {
    throw new PythonImportError('range(...) must have one or two arguments.', lineNumberAt(source, node.from))
  }

  return {
    type: 'for',
    slots: {
      var: variable,
      start: rangeArgs.length === 1 ? { type: 'num', value: '0' } : rangeArgs[0],
      end: rangeArgs[rangeArgs.length - 1],
      iterable: null,
    },
    body: mapBody(bodyNode, source),
  }
}

function splitForTargetAndIterable(node, expressions, source) {
  if (expressions.length === 2) {
    return {
      targetNode: expressions[0],
      iterableNode: expressions[1],
    }
  }

  const separators = []
  for (let i = 0; i < expressions.length - 1; i += 1) {
    separators.push(source.slice(expressions[i].to, expressions[i + 1].from))
  }

  const tupleSeparators = separators.slice(0, -1)
  const iterableSeparator = separators[separators.length - 1] ?? ''

  if (
    tupleSeparators.length > 0 &&
    tupleSeparators.every((separator) => separator.includes(',')) &&
    /\bin\b/.test(iterableSeparator)
  ) {
    return {
      targetNode: {
        type: 'tuple',
        items: expressions.slice(0, -1),
      },
      iterableNode: expressions[expressions.length - 1],
    }
  }

  throw new PythonImportError('Unsupported for loop.', lineNumberAt(source, node.from))
}

function mapFunctionDefinition(node, source) {
  const nameNode = node.getChild('VariableName')
  const paramListNode = node.getChild('ParamList')
  const bodyNode = node.getChild('Body')

  if (!nameNode || !paramListNode || !bodyNode) {
    throw new PythonImportError('Invalid function definition.', lineNumberAt(source, node.from))
  }

  return {
    type: 'funcDef',
    name: source.slice(nameNode.from, nameNode.to),
    params: extractParamNames(paramListNode, source),
    body: mapBody(bodyNode, source),
  }
}

function mapClassDefinition(node, source) {
  const nameNode = node.getChild('VariableName')
  const bodyNode = node.getChild('Body')
  const argListNode = node.getChild('ArgList')

  if (!nameNode || !bodyNode) {
    throw new PythonImportError('Invalid class definition.', lineNumberAt(source, node.from))
  }

  return {
    type: 'classDef',
    name: source.slice(nameNode.from, nameNode.to),
    args: argListNode ? extractCallArgs(argListNode, source) : [],
    body: mapBody(bodyNode, source),
  }
}

function mapRaiseStatement(node, source) {
  const text = source.slice(node.from, node.to).trim()
  const clause = text.replace(/^raise\b/, '').trim()

  if (!clause) {
    return {
      type: 'raiseStmt',
      slots: {
        value: null,
        cause: null,
      },
    }
  }

  const causeParts = splitTopLevelOnce(clause, ' from ')
  const valueText = (causeParts?.[0] || clause).trim()
  const causeText = causeParts?.[1] || ''

  return {
    type: 'raiseStmt',
    slots: {
      value: valueText ? parsePythonExpression(valueText, source, node.from) : null,
      cause: causeText ? parsePythonExpression(causeText, source, node.from) : null,
    },
  }
}

function mapWithStatement(node, source) {
  const bodyNode = node.getChild('Body')
  if (!bodyNode) {
    throw new PythonImportError('Invalid with statement.', lineNumberAt(source, node.from))
  }

  const clauseText = source.slice(node.from, bodyNode.from)
    .replace(/^with\s+/, '')
    .replace(/:\s*$/, '')
    .trim()

  const items = splitTopLevel(clauseText, ',').filter(Boolean)
  if (!items.length) {
    throw new PythonImportError('with requires at least one context manager.', lineNumberAt(source, node.from))
  }

  return {
    type: 'withStmt',
    args: items.map((item) => {
      const [contextText] = splitWithItem(item)
      return parsePythonExpression(contextText, source, node.from)
    }),
    withAliases: items.map((item) => splitWithItem(item)[1]),
    body: mapBody(bodyNode, source),
  }
}

function mapMatchStatement(node, source) {
  const subjectNode = directExpressionChildren(node)[0]
  const matchBodyNode = directNamedChild(node, 'MatchBody')
  const clauses = matchBodyNode ? directNamedChildren(matchBodyNode, 'MatchClause') : []

  if (!subjectNode || !matchBodyNode || !clauses.length) {
    throw new PythonImportError('Invalid match statement.', lineNumberAt(source, node.from))
  }

  return {
    type: 'matchStmt',
    slots: {
      subject: mapExpression(subjectNode, source),
    },
    matchCases: clauses.map((clause) => mapMatchClause(clause, source)),
  }
}

function mapMatchClause(node, source) {
  const bodyNode = directNamedChild(node, 'Body')
  if (!bodyNode) {
    throw new PythonImportError('Invalid case clause.', lineNumberAt(source, node.from))
  }

  const headerText = source.slice(node.from, bodyNode.from)
    .replace(/^case\s+/, '')
    .replace(/:\s*$/, '')
    .trim()
  const guardParts = splitTopLevelOnce(headerText, ' if ')

  return {
    pattern: (guardParts?.[0] || headerText).trim() || '_',
    guard: guardParts?.[1] || '',
    body: mapBody(bodyNode, source),
  }
}

function mapReturnStatement(node, source) {
  const expressions = directExpressionChildren(node)
  return {
    type: 'return',
    slots: {
      value: expressions[0] ? mapExpression(expressions[0], source) : { type: 'var', value: 'None' },
    },
  }
}

function mapYieldStatement(node, source) {
  return yieldDescriptorFromSource(source.slice(node.from, node.to).trim(), source, node.from, 'yieldStmt')
}

function mapYieldExpression(node, source) {
  return yieldDescriptorFromSource(source.slice(node.from, node.to).trim(), source, node.from, 'yieldExpr')
}

function yieldDescriptorFromSource(text, source, offset, type) {
  const clause = text.replace(/^yield\b/, '').trim()
  const yieldFrom = clause.startsWith('from ')
  const valueText = (yieldFrom ? clause.replace(/^from\s+/, '') : clause).trim()

  return {
    type,
    yieldFrom,
    slots: {
      value: valueText ? parsePythonExpression(valueText, source, offset) : null,
    },
  }
}

function mapTryStatement(node, source) {
  const bodyNodes = directNamedChildren(node, 'Body')
  if (!bodyNodes.length) {
    throw new PythonImportError('Invalid try statement.', lineNumberAt(source, node.from))
  }

  const tryBodyNode = bodyNodes[0]
  const exceptHandlers = []
  let elseBody = []
  let finallyBody = []

  let cursor = node.from
  for (const bodyNode of bodyNodes) {
    const header = source.slice(cursor, bodyNode.from).trim()
    if (/^try\b/.test(header)) {
      cursor = bodyNode.to
      continue
    }

    if (/^except\b/.test(header)) {
      const clause = header.replace(/^except\b/, '').replace(/:\s*$/, '').trim()
      const normalizedClause = clause.startsWith('*') ? clause.slice(1).trim() : clause
      const match = normalizedClause.match(/^(.*?)(?:\s+as\s+([A-Za-z_]\w*))?$/s)
      const typeName = (match?.[1] || '').trim()
      const alias = match?.[2] || ''
      exceptHandlers.push({
        type: typeName,
        alias,
        body: mapBody(bodyNode, source),
      })
      cursor = bodyNode.to
      continue
    }

    if (/^else\b/.test(header)) {
      elseBody = mapBody(bodyNode, source)
      cursor = bodyNode.to
      continue
    }

    if (/^finally\b/.test(header)) {
      finallyBody = mapBody(bodyNode, source)
      cursor = bodyNode.to
      continue
    }

    throw new PythonImportError('Invalid try statement.', lineNumberAt(source, bodyNode.from))
  }

  if (!exceptHandlers.length && !finallyBody.length) {
    throw new PythonImportError('try must include at least one except or finally block.', lineNumberAt(source, node.from))
  }

  return {
    type: 'try',
    body: mapBody(tryBodyNode, source),
    exceptHandlers,
    elseBody,
    finallyBody,
    showElse: elseBody.length > 0,
    showFinally: finallyBody.length > 0,
  }
}

function mapExpressionStatement(node, source) {
  const expressions = directExpressionChildren(node)
  if (expressions.length !== 1) {
    throw new PythonImportError('Unsupported standalone expression.', lineNumberAt(source, node.from))
  }

  const expression = mapExpression(expressions[0], source)
  if (expression.type === 'callExpr' && expression.name === 'print') {
    if (expression.args.length !== 1) {
      throw new PythonImportError('print(...) currently supports exactly one argument.', lineNumberAt(source, node.from))
    }
    return {
      type: 'print',
      slots: {
        value: expression.args[0],
      },
    }
  }
  if (expression.type === 'callExpr') {
    return {
      type: 'callStmt',
      name: expression.name ?? '',
      args: expression.args,
      slots: expression.slots ?? {},
    }
  }

  return {
    type: 'exprStmt',
    slots: {
      value: expression,
    },
  }
}

function mapExpression(node, source) {
  if (node?.type === 'tuple') {
    return {
      type: 'tupleExpr',
      args: node.items.map((item) => mapExpression(item, source)),
    }
  }

  switch (node.name) {
    case 'VariableName':
    case 'None':
      return { type: 'var', value: source.slice(node.from, node.to) }
    case 'Boolean':
      return { type: 'bool', value: source.slice(node.from, node.to) }
    case 'Number':
      return { type: 'num', value: source.slice(node.from, node.to) }
    case 'String':
    case 'ContinuedString':
      return mapStringExpression(node, source)
    case 'FormatString':
      return mapFormatStringExpression(node, source)
    case 'ParenthesizedExpression': {
      const children = directExpressionChildren(node)
      if (!children.length) throw new PythonImportError('Expected an expression.', lineNumberAt(source, node.from))
      if (children.length === 1) {
        return mapExpression(children[0], source)
      }
      return {
        type: 'tupleExpr',
        args: children.map((child) => mapExpression(child, source)),
      }
    }
    case 'ArrayExpression':
      return mapArrayExpression(node, source)
    case 'ArrayComprehensionExpression':
      return mapArrayComprehensionExpression(node, source)
    case 'DictionaryExpression':
      return mapDictionaryExpression(node, source)
    case 'DictionaryComprehensionExpression':
      return mapDictionaryComprehensionExpression(node, source)
    case 'ComprehensionExpression':
      return mapGeneratorExpression(node, source)
    case 'YieldExpression':
      return mapYieldExpression(node, source)
    case 'BinaryExpression':
      return mapBinaryExpression(node, source)
    case 'ConditionalExpression':
      return mapConditionalExpression(node, source)
    case 'UnaryExpression':
      return mapUnaryExpression(node, source)
    case 'LambdaExpression':
      return mapLambdaExpression(node, source)
    case 'CallExpression':
      return mapCallExpression(node, source)
    case 'MemberExpression':
      return mapMemberExpression(node, source)
    default:
      return mapRawExpression(node, source)
  }
}

function mapRawStatement(node, source) {
  return {
    type: 'rawStmt',
    value: normalizeSource(source.slice(node.from, node.to)).trimEnd(),
  }
}

function mapRawExpression(node, source) {
  return {
    type: 'rawExpr',
    value: source.slice(node.from, node.to).trim(),
  }
}

function mapStringExpression(node, source) {
  const literal = parseStringLiteral(source.slice(node.from, node.to))
  if (literal.raw) {
    return {
      type: 'rawStr',
      value: literal.rawValue,
      tripleQuoted: literal.tripleQuoted,
    }
  }
  if (literal.tripleQuoted || literal.value.includes('\n')) {
    return { type: 'longStr', value: literal.value }
  }
  return { type: 'str', value: literal.value }
}

function mapFormatStringExpression(node, source) {
  const literal = parseStringLiteral(source.slice(node.from, node.to))
  return {
    type: 'formatStr',
    value: literal.rawValue,
    tripleQuoted: literal.tripleQuoted,
  }
}

function mapArrayExpression(node, source) {
  return {
    type: 'listExpr',
    args: directExpressionChildren(node).map((child) => mapExpression(child, source)),
  }
}

function mapArrayComprehensionExpression(node, source) {
  const { itemText, targetPattern, iterableText, filterText } = extractComprehensionParts(
    source.slice(node.from, node.to),
    source,
    node.from,
    'list comprehension',
  )

  return {
    type: 'listCompExpr',
    targetPattern,
    filterText,
    slots: {
      value: parsePythonExpression(itemText, source, node.from),
      iterable: parsePythonExpression(iterableText, source, node.from),
    },
  }
}

function mapDictionaryExpression(node, source) {
  const expressions = directExpressionChildren(node)
  if (expressions.length % 2 !== 0) {
    throw new PythonImportError('Invalid dictionary expression.', lineNumberAt(source, node.from))
  }

  const args = []
  for (let index = 0; index < expressions.length; index += 2) {
    args.push({
      type: 'dictEntryExpr',
      slots: {
        key: mapExpression(expressions[index], source),
        value: mapExpression(expressions[index + 1], source),
      },
    })
  }

  return {
    type: 'dictExpr',
    args,
  }
}

function mapDictionaryComprehensionExpression(node, source) {
  const { itemText, targetPattern, iterableText, filterText } = extractComprehensionParts(
    source.slice(node.from, node.to),
    source,
    node.from,
    'dictionary comprehension',
  )

  const pairParts = splitTopLevelOnce(itemText, ':')
  if (!pairParts) {
    throw new PythonImportError('Invalid dictionary comprehension.', lineNumberAt(source, node.from))
  }

  return {
    type: 'dictCompExpr',
    targetPattern,
    filterText,
    slots: {
      key: parsePythonExpression(pairParts[0], source, node.from),
      value: parsePythonExpression(pairParts[1], source, node.from),
      iterable: parsePythonExpression(iterableText, source, node.from),
    },
  }
}

function mapGeneratorExpression(node, source) {
  const { itemText, targetPattern, iterableText, filterText } = extractComprehensionParts(
    source.slice(node.from, node.to),
    source,
    node.from,
    'generator expression',
  )

  return {
    type: 'generatorExpr',
    targetPattern,
    filterText,
    slots: {
      value: parsePythonExpression(itemText, source, node.from),
      iterable: parsePythonExpression(iterableText, source, node.from),
    },
  }
}

function mapBinaryExpression(node, source) {
  const expressions = directExpressionChildren(node)
  if (expressions.length !== 2) {
    throw new PythonImportError('Unsupported expression.', lineNumberAt(source, node.from))
  }

  const operator = source.slice(expressions[0].to, expressions[1].from).trim()
  if (['and', 'or'].includes(operator)) {
    return {
      type: 'boolOp',
      op: operator,
      slots: {
        left: mapExpression(expressions[0], source),
        right: mapExpression(expressions[1], source),
      },
    }
  }

  if (['==', '!=', '<', '>', '<=', '>=', 'is', 'is not', 'in', 'not in'].includes(operator)) {
    return {
      type: 'compare',
      op: operator,
      slots: {
        left: mapExpression(expressions[0], source),
        right: mapExpression(expressions[1], source),
      },
    }
  }

  if (['+', '-', '*', '/', '//', '%', '**'].includes(operator)) {
    return {
      type: 'binOp',
      op: operator,
      slots: {
        left: mapExpression(expressions[0], source),
        right: mapExpression(expressions[1], source),
      },
    }
  }

  throw new PythonImportError(`Unsupported operator "${operator}".`, lineNumberAt(source, node.from))
}

function mapConditionalExpression(node, source) {
  const expressions = directExpressionChildren(node)
  if (expressions.length !== 3) {
    throw new PythonImportError('Unsupported conditional expression.', lineNumberAt(source, node.from))
  }

  return {
    type: 'conditionalExpr',
    slots: {
      whenTrue: mapExpression(expressions[0], source),
      condition: mapExpression(expressions[1], source),
      whenFalse: mapExpression(expressions[2], source),
    },
  }
}

function mapUnaryExpression(node, source) {
  const expressions = directExpressionChildren(node)
  const operandNode = expressions[expressions.length - 1]
  if (!operandNode) {
    throw new PythonImportError('Expected an expression.', lineNumberAt(source, node.from))
  }

  const prefix = source.slice(node.from, operandNode.from).trim()
  if (prefix === 'not') {
    return {
      type: 'not',
      slots: {
        value: mapExpression(operandNode, source),
      },
    }
  }

  if (prefix === '-') {
    return {
      type: 'binOp',
      op: '-',
      slots: {
        left: { type: 'num', value: '0' },
        right: mapExpression(operandNode, source),
      },
    }
  }

  if (prefix === '+') {
    return mapExpression(operandNode, source)
  }

  throw new PythonImportError(`Unsupported unary operator "${prefix}".`, lineNumberAt(source, node.from))
}

function mapLambdaExpression(node, source) {
  const paramListNode = node.getChild('ParamList')
  const expressions = directExpressionChildren(node)
  const bodyNode = expressions[expressions.length - 1]

  if (!paramListNode || !bodyNode) {
    throw new PythonImportError('Invalid lambda expression.', lineNumberAt(source, node.from))
  }

  return {
    type: 'lambda',
    params: extractParamNames(paramListNode, source),
    slots: {
      value: mapExpression(bodyNode, source),
    },
  }
}

function mapCallExpression(node, source) {
  const calleeNode = directExpressionChildren(node)[0]
  const argListNode = node.getChild('ArgList')

  if (!calleeNode || !argListNode) {
    throw new PythonImportError('Invalid call expression.', lineNumberAt(source, node.from))
  }

  const callee = mapExpression(calleeNode, source)
  const args = extractCallArgs(argListNode, source)

  if (callee.type === 'var') {
    return { type: 'callExpr', name: callee.value, args }
  }

  return {
    type: 'callExpr',
    args,
    slots: {
      callee,
    },
  }
}

function mapMemberExpression(node, source) {
  const baseNode = directExpressionChildren(node)[0]
  if (!baseNode) {
    throw new PythonImportError('Invalid member expression.', lineNumberAt(source, node.from))
  }

  const base = mapExpression(baseNode, source)
  const tail = source.slice(baseNode.to, node.to).trim()

  if (tail.startsWith('[') && tail.endsWith(']')) {
    const subscriptText = tail.slice(1, -1).trim()
    return {
      type: 'subscriptExpr',
      slots: {
        value: base,
        index: parseSubscriptIndexExpression(subscriptText, source, node.from),
      },
    }
  }

  if (!tail.startsWith('.')) {
    throw new PythonImportError('Expected a property name.', lineNumberAt(source, node.from))
  }

  const propertyName = tail.slice(1).trim()
  if (!/^[A-Za-z_]\w*$/.test(propertyName)) {
    throw new PythonImportError('Expected a property name.', lineNumberAt(source, node.from))
  }

  return {
    type: 'memberExpr',
    name: propertyName,
    slots: {
      value: base,
    },
  }
}

function extractCallArgs(argListNode, source) {
  const rawArgs = source.slice(argListNode.from + 1, argListNode.to - 1).trim()
  if (!rawArgs) {
    return []
  }

  const args = []
  for (const part of splitTopLevel(rawArgs, ',')) {
    const text = part.trim()
    if (!text) continue

    if (/^(\*{1,2}|[A-Za-z_]\w*\s*=)/.test(text)) {
      args.push({
        type: 'rawExpr',
        value: text,
      })
      continue
    }

    args.push(parsePythonExpression(text, source, argListNode.from))
  }

  return args
}

function extractParamNames(paramListNode, source) {
  const params = []
  for (const child of childNodes(paramListNode)) {
    if (child.name === 'VariableName') {
      params.push(source.slice(child.from, child.to))
    }
  }
  return params
}

function directExpressionChildren(node) {
  return childNodes(node).filter((child) => isExpressionNode(child))
}

function isExpressionNode(node) {
  return EXPRESSION_NODE_NAMES.has(node.name) || node.name.endsWith('Expression')
}

const EXPRESSION_NODE_NAMES = new Set([
  'VariableName',
  'Boolean',
  'None',
  'Number',
  'String',
  'ContinuedString',
  'FormatString',
  'BinaryExpression',
  'ConditionalExpression',
  'UnaryExpression',
  'LambdaExpression',
  'CallExpression',
  'MemberExpression',
  'YieldExpression',
  'ParenthesizedExpression',
  'ArrayExpression',
  'ArrayComprehensionExpression',
  'ComprehensionExpression',
  'DictionaryExpression',
  'DictionaryComprehensionExpression',
])

function childNodes(node) {
  const result = []
  for (let child = node.firstChild; child; child = child.nextSibling) {
    result.push(child)
  }
  return result
}

function directNamedChildren(node, name) {
  return childNodes(node).filter((child) => nodeNameIs(child, name))
}

function directNamedChild(node, name) {
  return directNamedChildren(node, name)[0] ?? null
}

function nodeNameIs(node, expectedName) {
  return node?.name?.toLowerCase() === expectedName.toLowerCase()
}

function bodyContentNodes(node) {
  return childNodes(node).filter((child) =>
    child.name === 'Comment' || shouldUnwrap(child) || isStatementNode(child))
}

function isStatementNode(node) {
  return STATEMENT_NODE_NAMES.has(node.name) || node.name.endsWith('Statement')
}

function shouldUnwrap(node) {
  return ['statement', 'simpleStatement', 'smallStatement'].includes(node.name)
}

const STATEMENT_NODE_NAMES = new Set([
  'DecoratedStatement',
  'AssignStatement',
  'UpdateStatement',
  'ImportStatement',
  'PrintStatement',
  'WhileStatement',
  'IfStatement',
  'ForStatement',
  'FunctionDefinition',
  'ClassDefinition',
  'ReturnStatement',
  'TryStatement',
  'BreakStatement',
  'ContinueStatement',
  'PassStatement',
  'ExpressionStatement',
  'StatementGroup',
])

function isStructuralNoise(node) {
  return node.type.isAnonymous
    || node.name === 'blankLine'
    || node.name === 'newline'
    || node.name === 'indent'
    || node.name === 'dedent'
    || node.name === 'eof'
}

function dottedNameToExpr(name) {
  const parts = name.split('.')
  let expr = { type: 'var', value: parts[0] }
  for (const part of parts.slice(1)) {
    expr = {
      type: 'memberExpr',
      name: part,
      slots: {
        value: expr,
      },
    }
  }
  return expr
}

function splitTopLevel(source, delimiter) {
  const parts = []
  let current = ''
  let depth = 0
  let quote = null

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    const nextThree = source.slice(index, index + 3)
    const previous = source[index - 1]

    if (quote) {
      current += char
      if (quote.length === 3) {
        if (nextThree === quote) {
          current += source.slice(index + 1, index + 3)
          index += 2
          quote = null
        }
      } else if (char === quote && previous !== '\\') {
        quote = null
      }
      continue
    }

    if (nextThree === "'''" || nextThree === '"""') {
      quote = nextThree
      current += nextThree
      index += 2
      continue
    }

    if (char === '"' || char === "'") {
      quote = char
      current += char
      continue
    }

    if ('([{'.includes(char)) depth += 1
    if (')]}'.includes(char)) depth -= 1

    if (char === delimiter && depth === 0) {
      parts.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  if (current.trim() || source.includes(delimiter)) {
    parts.push(current.trim())
  }

  return parts
}

function splitTopLevelOnce(source, delimiter) {
  const delimiterIndex = findTopLevelSequence(source, delimiter)
  if (delimiterIndex === -1) {
    return null
  }

  return [
    source.slice(0, delimiterIndex).trim(),
    source.slice(delimiterIndex + delimiter.length).trim(),
  ]
}

function findTopLevelSequence(source, sequence) {
  let depth = 0
  let quote = null

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    const nextThree = source.slice(index, index + 3)
    const previous = source[index - 1]

    if (quote) {
      if (quote.length === 3) {
        if (nextThree === quote) {
          index += 2
          quote = null
        }
      } else if (char === quote && previous !== '\\') {
        quote = null
      }
      continue
    }

    if (nextThree === "'''" || nextThree === '"""') {
      quote = nextThree
      index += 2
      continue
    }

    if (char === '"' || char === "'") {
      quote = char
      continue
    }

    if ('([{'.includes(char)) depth += 1
    if (')]}'.includes(char)) depth -= 1

    if (depth === 0 && source.startsWith(sequence, index)) {
      return index
    }
  }

  return -1
}

function splitWithItem(itemText) {
  const aliasParts = splitTopLevelOnce(itemText, ' as ')
  if (!aliasParts) {
    return [itemText.trim(), '']
  }

  return [aliasParts[0], aliasParts[1]]
}

function extractComprehensionParts(expressionText, fullSource, offset = 0, label = 'comprehension') {
  const trimmed = expressionText.trim()
  let inner = trimmed

  if ((trimmed.startsWith('[') && trimmed.endsWith(']'))
    || (trimmed.startsWith('{') && trimmed.endsWith('}'))
    || (trimmed.startsWith('(') && trimmed.endsWith(')'))) {
    inner = trimmed.slice(1, -1).trim()
  }

  const forParts = splitTopLevelOnce(inner, ' for ')
  if (!forParts) {
    throw new PythonImportError(`Invalid ${label}.`, lineNumberAt(fullSource, offset))
  }

  const iterableParts = splitTopLevelOnce(forParts[1], ' in ')
  if (!iterableParts) {
    throw new PythonImportError(`Invalid ${label}.`, lineNumberAt(fullSource, offset))
  }

  const filterIndex = findTopLevelSequence(iterableParts[1], ' if ')
  const iterableText = (filterIndex === -1 ? iterableParts[1] : iterableParts[1].slice(0, filterIndex)).trim()
  const filterText = filterIndex === -1 ? '' : iterableParts[1].slice(filterIndex + 1).trim()

  return {
    itemText: forParts[0].trim(),
    targetPattern: iterableParts[0].trim(),
    iterableText,
    filterText,
  }
}

function parseSubscriptIndexExpression(subscriptSource, fullSource, offset = 0) {
  const parts = splitTopLevel(subscriptSource, ',')

  if (parts.length > 1) {
    return {
      type: 'tupleExpr',
      args: parts.map((part) => parseSubscriptPartExpression(part, fullSource, offset)),
    }
  }

  return parseSubscriptPartExpression(subscriptSource, fullSource, offset)
}

function parseSubscriptPartExpression(partSource, fullSource, offset = 0) {
  const trimmed = partSource.trim()
  if (!trimmed) {
    throw new PythonImportError('Invalid subscript expression.', lineNumberAt(fullSource, offset))
  }

  return hasTopLevelDelimiter(trimmed, ':')
    ? parseSliceExpression(trimmed, fullSource, offset)
    : parsePythonExpression(trimmed, fullSource, offset)
}

function hasTopLevelDelimiter(source, delimiter) {
  return splitTopLevel(source, delimiter).length > 1
}

function parseSliceExpression(sliceSource, fullSource, offset = 0) {
  const parts = splitTopLevel(sliceSource, ':')
  if (parts.length < 2 || parts.length > 3) {
    throw new PythonImportError('Invalid slice expression.', lineNumberAt(fullSource, offset))
  }

  return {
    type: 'sliceExpr',
    slots: {
      start: parts[0] ? parsePythonExpression(parts[0], fullSource, offset) : null,
      end: parts[1] ? parsePythonExpression(parts[1], fullSource, offset) : null,
      step: parts[2] ? parsePythonExpression(parts[2], fullSource, offset) : null,
    },
  }
}

function parseStringLiteral(raw) {
  const prefixMatch = raw.match(/^[rRuUbBfF]*/)
  const prefix = (prefixMatch?.[0] || '').toLowerCase()
  const body = raw.slice(prefix.length)
  const tripleQuoted = isTripleQuoted(body)
  const delimiterLength = tripleQuoted ? 3 : 1
  const rawValue = body.slice(delimiterLength, body.length - delimiterLength)

  return {
    prefix,
    raw: prefix.includes('r'),
    tripleQuoted,
    rawValue,
    value: prefix.includes('r') || prefix.includes('f')
      ? rawValue
      : decodeEscapedStringValue(rawValue),
  }
}

function decodeStringValue(raw) {
  return parseStringLiteral(raw).value
}

function decodeEscapedStringValue(inner) {
  return inner
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\')
}

function isTripleQuoted(raw) {
  const body = raw.replace(/^[rRuUbBfF]*/, '')
  return body.startsWith("'''") || body.startsWith('"""')
}

function unsupportedNode(node, source, message = `Unsupported ${node.name}.`) {
  return new PythonImportError(message, lineNumberAt(source, node.from))
}

function parsePythonExpression(expressionSource, fullSource, offset = 0) {
  const bareGenerator = tryParseBareGeneratorExpression(expressionSource, fullSource, offset)
  if (bareGenerator) {
    return bareGenerator
  }

  const wrapped = `value = ${expressionSource}`
  const tree = pythonParser.parse(wrapped)
  throwOnParseErrors(tree, wrapped)
  const topLevel = mapBody(tree.topNode, wrapped)
  const assign = topLevel[0]
  if (!assign || assign.type !== 'assign') {
    throw new PythonImportError('Expected an expression.', lineNumberAt(fullSource, offset))
  }
  return assign.slots.value
}

function tryParseBareGeneratorExpression(expressionSource, fullSource, offset = 0) {
  const trimmed = expressionSource.trim()
  if (!trimmed || trimmed.startsWith('(') || trimmed.startsWith('[') || trimmed.startsWith('{')) {
    return null
  }

  if (findTopLevelSequence(trimmed, ' for ') === -1) {
    return null
  }

  const forParts = splitTopLevelOnce(trimmed, ' for ')
  if (!forParts || !splitTopLevelOnce(forParts[1], ' in ')) {
    return null
  }

  const { itemText, targetPattern, iterableText, filterText } = extractComprehensionParts(
    trimmed,
    fullSource,
    offset,
    'generator expression',
  )

  return {
    type: 'generatorExpr',
    targetPattern,
    filterText,
    slots: {
      value: parsePythonExpression(itemText, fullSource, offset),
      iterable: parsePythonExpression(iterableText, fullSource, offset),
    },
  }
}

function lineNumberAt(source, position) {
  return source.slice(0, position).split('\n').length
}
