export function pythonBlocksToPython(blocks, rootBody) {
  if (!rootBody || !rootBody.length) {
    return '# Empty program\n# Drag blocks onto the canvas'
  }
  return rootBody.map(id => stmtCode(blocks, id, 0)).join('\n')
}

function indentRawCode(raw, depth) {
  const prefix = '    '.repeat(depth)
  return (raw || '').split('\n').map((line) => line ? `${prefix}${line}` : line).join('\n')
}

function generatorExprCode(blocks, block) {
  const e = (sid) => exprCode(blocks, sid)
  const filterCode = block.filterText ? ` ${block.filterText}` : ''
  return `(${e(block.slots.value)} for ${block.targetPattern || 'item'} in ${e(block.slots.iterable)}${filterCode})`
}

function callArgsCode(blocks, args) {
  const activeArgs = (args || []).filter(Boolean)
  return activeArgs.map((argId) => {
    const argBlock = blocks[argId]
    if (activeArgs.length === 1 && argBlock?.type === 'generatorExpr') {
      return generatorExprCode(blocks, argBlock).slice(1, -1)
    }
    return exprCode(blocks, argId)
  }).join(', ')
}

function yieldCode(blocks, block) {
  const e = (sid) => exprCode(blocks, sid)
  const valueCode = block.slots.value ? e(block.slots.value) : ''
  return `yield${block.yieldFrom ? ' from' : ''}${valueCode ? ` ${valueCode}` : ''}`
}

function chooseTripleQuote(text) {
  if (!text.includes('"""')) return '"""'
  if (!text.includes("'''")) return "'''"
  return '"""'
}

function chooseShortQuote(text) {
  if (text.includes('"') && !text.includes("'")) return "'"
  return '"'
}

function escapeNormalStringContent(text, quote) {
  let escaped = text
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')

  return quote === '"'
    ? escaped.replace(/"/g, '\\"')
    : escaped.replace(/'/g, "\\'")
}

function escapeTripleStringContent(text, quote) {
  const escaped = text.replace(/\\/g, '\\\\')
  return quote === '"""'
    ? escaped.replace(/"""/g, '\\"\\"\\"')
    : escaped.replace(/'''/g, "\\'\\'\\'")
}

function encodeRawString(prefix, text, tripleQuoted) {
  const needsTripleQuoted = tripleQuoted
    || /[\r\n]/.test(text)
    || text.endsWith('\\')
    || (text.includes('"') && text.includes("'"))

  if (needsTripleQuoted) {
    const quote = chooseTripleQuote(text)
    const escaped = quote === '"""'
      ? text.replace(/"""/g, '\\"\\"\\"')
      : text.replace(/'''/g, "\\'\\'\\'")
    return `${prefix}${quote}${escaped}${quote}`
  }

  const quote = chooseShortQuote(text)
  return `${prefix}${quote}${text}${quote}`
}

function encodeQuotedString(prefix, value, { tripleQuoted = false, raw = false } = {}) {
  const text = String(value || '')

  if (raw) {
    return encodeRawString(prefix, text, tripleQuoted)
  }

  if (tripleQuoted) {
    const quote = chooseTripleQuote(text)
    return `${prefix}${quote}${escapeTripleStringContent(text, quote)}${quote}`
  }

  const quote = chooseShortQuote(text)
  return `${prefix}${quote}${escapeNormalStringContent(text, quote)}${quote}`
}

function stmtCode(blocks, id, depth) {
  const b = blocks[id]
  const p = '    '.repeat(depth)
  const body = (arr) =>
    arr && arr.length
      ? arr.map(cid => stmtCode(blocks, cid, depth + 1)).join('\n')
      : `${p}    pass`
  const e = (sid) => exprCode(blocks, sid)

  switch (b.type) {
    case 'assign': return `${p}${e(b.slots.target)} = ${e(b.slots.value)}`
    case 'annAssign': return `${p}${e(b.slots.target)}: ${b.annotation || 'Any'}${b.slots.value ? ` = ${e(b.slots.value)}` : ''}`
    case 'augAssign': return `${p}${e(b.slots.target)} ${b.op || '+'}= ${e(b.slots.value)}`
    case 'decoratorStmt': return `${p}@${b.value || 'decorator'}`
    case 'rawStmt': return indentRawCode(b.value || '# raw statement', depth)
    case 'commentStmt': return `${p}# ${b.value || ''}`.trimEnd()
    case 'exprStmt': return `${p}${e(b.slots.value)}`
    case 'importStmt': return `${p}import ${e(b.slots.module)}${b.alias ? ` as ${b.alias}` : ''}`
    case 'fromImportStmt': {
      const names = []
      if (b.slots.name) {
        names.push(`${e(b.slots.name)}${b.alias ? ` as ${b.alias}` : ''}`)
      }
      for (let i = 0; i < (b.args || []).length; i += 1) {
        const argId = b.args[i]
        if (!argId) continue
        const alias = b.importAliases?.[i] || ''
        names.push(`${e(argId)}${alias ? ` as ${alias}` : ''}`)
      }
      return `${p}from ${e(b.slots.module)} import ${names.join(', ')}`
    }
    case 'print': return `${p}print(${e(b.slots.value)})`
    case 'input': return `${p}${e(b.slots.target)} = input(${e(b.slots.prompt)})`
    case 'for': {
      if (b.slots.iterable) {
        return `${p}for ${e(b.slots.var)} in ${e(b.slots.iterable)}:\n${body(b.body)}`
      }
      return `${p}for ${e(b.slots.var)} in range(${e(b.slots.start)}, ${e(b.slots.end)}):\n${body(b.body)}`
    }
    case 'while': return `${p}while ${e(b.slots.condition)}:\n${body(b.body)}`
    case 'if': {
      let code = `${p}if ${e(b.slots.condition)}:\n${body(b.body)}`
      if (b.elseBody && b.elseBody.length) code += `\n${p}else:\n${body(b.elseBody)}`
      return code
    }
    case 'try': {
      let code = `${p}try:\n${body(b.body)}`
      for (const handler of (b.exceptHandlers || [])) {
        const typeCode = handler.type ? ` ${handler.type}` : ''
        const aliasCode = handler.alias ? ` as ${handler.alias}` : ''
        const handlerBody = handler.body?.length
          ? handler.body.map(cid => stmtCode(blocks, cid, depth + 1)).join('\n')
          : `${p}    pass`
        code += `\n${p}except${typeCode}${aliasCode}:\n${handlerBody}`
      }
      if ((b.showElse || b.elseBody?.length) && b.elseBody) {
        code += `\n${p}else:\n${body(b.elseBody)}`
      }
      if ((b.showFinally || b.finallyBody?.length) && b.finallyBody) {
        code += `\n${p}finally:\n${body(b.finallyBody)}`
      }
      return code
    }
    case 'raiseStmt': {
      const valueCode = b.slots.value ? e(b.slots.value) : ''
      const causeCode = b.slots.cause ? ` from ${e(b.slots.cause)}` : ''
      return `${p}raise${valueCode ? ` ${valueCode}` : ''}${causeCode}`
    }
    case 'withStmt': {
      const items = (b.args || [])
        .map((argId, index) => {
          if (!argId) return null
          const alias = b.withAliases?.[index] || ''
          return `${e(argId)}${alias ? ` as ${alias}` : ''}`
        })
        .filter(Boolean)
      return `${p}with ${items.join(', ')}:\n${body(b.body)}`
    }
    case 'matchStmt': {
      const cases = (b.matchCases || []).map((matchCase) => {
        const guardCode = matchCase.guard ? ` if ${matchCase.guard}` : ''
        const caseBody = matchCase.body?.length
          ? matchCase.body.map((cid) => stmtCode(blocks, cid, depth + 1)).join('\n')
          : `${p}    pass`
        return `${p}case ${matchCase.pattern || '_'}${guardCode}:\n${caseBody}`
      })
      return `${p}match ${e(b.slots.subject)}:\n${cases.join('\n')}`
    }
    case 'funcDef':
      return `${p}def ${b.name || 'my_func'}(${(b.params || []).join(', ')}):\n${body(b.body)}`
    case 'classDef': {
      const bases = (b.args || []).filter(Boolean).map(a => e(a)).join(', ')
      const header = bases ? `${p}class ${b.name || 'MyClass'}(${bases}):` : `${p}class ${b.name || 'MyClass'}:`
      return `${header}\n${body(b.body)}`
    }
    case 'return': return `${p}return ${e(b.slots.value)}`
    case 'yieldStmt': return `${p}${yieldCode(blocks, b)}`
    case 'callStmt': {
      const callee = b.slots?.callee ? e(b.slots.callee) : (b.name || '???')
      return `${p}${callee}(${callArgsCode(blocks, b.args)})`
    }
    case 'break': return `${p}break`
    case 'continue': return `${p}continue`
    default: return `${p}# ???`
  }
}

function exprCode(blocks, id) {
  if (!id) return '___'
  const b = blocks[id]
  if (!b) return '___'
  const e = (sid) => exprCode(blocks, sid)
  switch (b.type) {
    case 'var': return b.value || '_'
    case 'bool': return b.value || 'False'
    case 'num': return b.value || '0'
    case 'str': return encodeQuotedString('', b.value)
    case 'longStr': return encodeQuotedString('', b.value, { tripleQuoted: true })
    case 'formatStr': return encodeQuotedString('f', b.value, { tripleQuoted: Boolean(b.tripleQuoted) })
    case 'rawStr': return encodeQuotedString('r', b.value, { tripleQuoted: Boolean(b.tripleQuoted), raw: true })
    case 'binOp': return `(${e(b.slots.left)} ${b.op || '+'} ${e(b.slots.right)})`
    case 'compare': return `${e(b.slots.left)} ${b.op || '=='} ${e(b.slots.right)}`
    case 'boolOp': return `(${e(b.slots.left)} ${b.op || 'and'} ${e(b.slots.right)})`
    case 'conditionalExpr': return `(${e(b.slots.whenTrue)} if ${e(b.slots.condition)} else ${e(b.slots.whenFalse)})`
    case 'not': return `not (${e(b.slots.value)})`
    case 'memberExpr': return `${e(b.slots.value)}.${b.name || 'attr'}`
    case 'subscriptExpr': return `${e(b.slots.value)}[${e(b.slots.index)}]`
    case 'sliceExpr': {
      const start = b.slots.start ? e(b.slots.start) : ''
      const end = b.slots.end ? e(b.slots.end) : ''
      const step = b.slots.step ? e(b.slots.step) : ''
      return step ? `${start}:${end}:${step}` : `${start}:${end}`
    }
    case 'tupleExpr': return (b.args || []).filter(Boolean).map(a => e(a)).join(', ')
    case 'listExpr': return `[${(b.args || []).filter(Boolean).map(a => e(a)).join(', ')}]`
    case 'listCompExpr': {
      const filterCode = b.filterText ? ` ${b.filterText}` : ''
      return `[${e(b.slots.value)} for ${b.targetPattern || 'item'} in ${e(b.slots.iterable)}${filterCode}]`
    }
    case 'dictEntryExpr': return `${e(b.slots.key)}: ${e(b.slots.value)}`
    case 'dictExpr': return `{${(b.args || []).filter(Boolean).map(a => e(a)).join(', ')}}`
    case 'dictCompExpr': {
      const filterCode = b.filterText ? ` ${b.filterText}` : ''
      return `{${e(b.slots.key)}: ${e(b.slots.value)} for ${b.targetPattern || 'item'} in ${e(b.slots.iterable)}${filterCode}}`
    }
    case 'generatorExpr': return generatorExprCode(blocks, b)
    case 'yieldExpr': return `(${yieldCode(blocks, b)})`
    case 'callExpr': {
      const callee = b.slots?.callee ? e(b.slots.callee) : (b.name || '???')
      return `${callee}(${callArgsCode(blocks, b.args)})`
    }
    case 'lambda': return `lambda ${(b.params || []).join(', ')}: ${e(b.slots.value)}`
    case 'rawExpr': return b.value || '___'
    default: return '???'
  }
}
