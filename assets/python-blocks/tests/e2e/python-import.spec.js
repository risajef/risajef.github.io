import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import { parsePythonToBlocks } from '../../src/utilities/python-to-blocks.js'

function parseWithContext(source) {
  try {
    return parsePythonToBlocks(source)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Parse failed for source:\n${source}\n\n${message}`)
  }
}

function readWorkspacePythonFile(relativePath) {
  return fs.readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8')
}


test.describe('Python import parser', () => {


  test('parses simple import statements', () => {
    const result = parseWithContext('import math\nimport os as operating_system')

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      type: 'importStmt',
      slots: {
        module: { type: 'var', value: 'math' },
      },
      alias: '',
    })
    expect(result[1]).toMatchObject({
      type: 'importStmt',
      slots: {
        module: { type: 'var', value: 'os' },
      },
      alias: 'operating_system',
    })
  })




  test('parses from import as statements', () => {
    const result = parseWithContext('from math import sqrt as square_root')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'fromImportStmt',
      slots: {
        module: { type: 'var', value: 'math' },
        name: { type: 'var', value: 'sqrt' },
      },
      alias: 'square_root',
    })

  })

  test('parses from import lists', () => {
    const result = parseWithContext('from torch.amp import autocast, GradScaler')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'fromImportStmt',
      slots: {
        module: {
          type: 'memberExpr',
          name: 'amp',
          slots: {
            value: { type: 'var', value: 'torch' },
          },
        },
        name: { type: 'var', value: 'autocast' },
      },
      alias: '',
      importAliases: [''],
    })
    expect(result[0].args).toHaveLength(1)
    expect(result[0].args[0]).toMatchObject({ type: 'var', value: 'GradScaler' })
  })

  test('parses subscript assignment targets', () => {
    const result = parseWithContext('os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'assign',
      slots: {
        target: {
          type: 'subscriptExpr',
          slots: {
            value: {
              type: 'memberExpr',
              name: 'environ',
              slots: {
                value: { type: 'var', value: 'os' },
              },
            },
            index: { type: 'str', value: 'TF_ENABLE_ONEDNN_OPTS' },
          },
        },
        value: { type: 'str', value: '0' },
      },
    })
  })

  test('parses tuple assignment targets', () => {
    const result = parseWithContext('height, width = resolution.dimensions()')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'assign',
      slots: {
        target: {
          type: 'tupleExpr',
        },
        value: {
          type: 'callExpr',
          slots: {
            callee: {
              type: 'memberExpr',
              name: 'dimensions',
            },
          },
        },
      },
    })
    expect(result[0].slots.target.args).toHaveLength(2)
    expect(result[0].slots.target.args[0]).toMatchObject({ type: 'var', value: 'height' })
    expect(result[0].slots.target.args[1]).toMatchObject({ type: 'var', value: 'width' })
    expect(result[0].slots.value.slots.callee.slots.value).toMatchObject({ type: 'var', value: 'resolution' })
  })

  test('parses tuple-unpacking assignments on both sides', () => {
    const result = parseWithContext('x, target = batch["image"].to(device), batch["label"].to(device)')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'assign',
      slots: {
        target: { type: 'tupleExpr' },
        value: { type: 'tupleExpr' },
      },
    })
    expect(result[0].slots.target.args).toEqual([
      { type: 'var', value: 'x' },
      { type: 'var', value: 'target' },
    ])
    expect(result[0].slots.value.args).toHaveLength(2)
    expect(result[0].slots.value.args[0]).toMatchObject({ type: 'callExpr' })
    expect(result[0].slots.value.args[1]).toMatchObject({ type: 'callExpr' })
  })

  test('parses list literal assignments', () => {
    const result = parseWithContext('all_predictions = []\nvalues = [first, second]')

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      type: 'assign',
      slots: {
        target: { type: 'var', value: 'all_predictions' },
        value: { type: 'listExpr', args: [] },
      },
    })
    expect(result[1]).toMatchObject({
      type: 'assign',
      slots: {
        target: { type: 'var', value: 'values' },
        value: { type: 'listExpr' },
      },
    })
    expect(result[1].slots.value.args).toHaveLength(2)
    expect(result[1].slots.value.args[0]).toMatchObject({ type: 'var', value: 'first' })
    expect(result[1].slots.value.args[1]).toMatchObject({ type: 'var', value: 'second' })
  })

  test('parses boolean literal assignments as bool blocks', () => {
    const result = parseWithContext('flag = True\nother = False')

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      type: 'assign',
      slots: {
        target: { type: 'var', value: 'flag' },
        value: { type: 'bool', value: 'True' },
      },
    })
    expect(result[1]).toMatchObject({
      type: 'assign',
      slots: {
        target: { type: 'var', value: 'other' },
        value: { type: 'bool', value: 'False' },
      },
    })
  })

  test('parses list comprehensions', () => {
    const result = parseWithContext('pairs = [name for name in names if name]')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'assign',
      slots: {
        target: { type: 'var', value: 'pairs' },
        value: {
          type: 'listCompExpr',
          targetPattern: 'name',
          filterText: 'if name',
          slots: {
            value: { type: 'var', value: 'name' },
            iterable: { type: 'var', value: 'names' },
          },
        },
      },
    })
  })

  test('parses dictionary literal assignments', () => {
    const result = parseWithContext('summary = {"checkpoint_path": str(checkpoint_path), "model_size": model_size.value}')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'assign',
      slots: {
        target: { type: 'var', value: 'summary' },
        value: { type: 'dictExpr' },
      },
    })
    expect(result[0].slots.value.args).toHaveLength(2)
    expect(result[0].slots.value.args[0]).toMatchObject({
      type: 'dictEntryExpr',
      slots: {
        key: { type: 'str', value: 'checkpoint_path' },
        value: { type: 'callExpr', name: 'str' },
      },
    })
    expect(result[0].slots.value.args[1]).toMatchObject({
      type: 'dictEntryExpr',
      slots: {
        key: { type: 'str', value: 'model_size' },
        value: {
          type: 'memberExpr',
          name: 'value',
        },
      },
    })
  })

  test('parses dictionary comprehensions', () => {
    const result = parseWithContext('serialized = {str(key): serialize_value(val) for key, val in value.items()}')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'assign',
      slots: {
        target: { type: 'var', value: 'serialized' },
        value: {
          type: 'dictCompExpr',
          targetPattern: 'key, val',
        },
      },
    })
    expect(result[0].slots.value.slots.key).toMatchObject({ type: 'callExpr', name: 'str' })
    expect(result[0].slots.value.slots.value).toMatchObject({ type: 'callExpr', name: 'serialize_value' })
    expect(result[0].slots.value.slots.iterable).toMatchObject({
      type: 'callExpr',
      slots: {
        callee: {
          type: 'memberExpr',
          name: 'items',
        },
      },
    })
  })

  test('parses generator expressions inside call arguments', () => {
    const result = parseWithContext('needs_train = any("train.py" in arg for arg in cmdline)')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'assign',
      slots: {
        target: { type: 'var', value: 'needs_train' },
        value: {
          type: 'callExpr',
          name: 'any',
        },
      },
    })

    expect(result[0].slots.value.args).toHaveLength(1)
    expect(result[0].slots.value.args[0]).toMatchObject({
      type: 'generatorExpr',
      targetPattern: 'arg',
      slots: {
        value: {
          type: 'compare',
          op: 'in',
          slots: {
            left: { type: 'str', value: 'train.py' },
            right: { type: 'var', value: 'arg' },
          },
        },
        iterable: { type: 'var', value: 'cmdline' },
      },
    })
  })

  test('parses yield statements and yield expressions', () => {
    const result = parseWithContext('def gen():\n    yield item\n    yield from values\n    current = (yield from stream)')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ type: 'funcDef', name: 'gen' })
    expect(result[0].body).toHaveLength(3)
    expect(result[0].body[0]).toMatchObject({
      type: 'yieldStmt',
      yieldFrom: false,
      slots: { value: { type: 'var', value: 'item' } },
    })
    expect(result[0].body[1]).toMatchObject({
      type: 'yieldStmt',
      yieldFrom: true,
      slots: { value: { type: 'var', value: 'values' } },
    })
    expect(result[0].body[2]).toMatchObject({
      type: 'assign',
      slots: {
        target: { type: 'var', value: 'current' },
        value: {
          type: 'yieldExpr',
          yieldFrom: true,
          slots: { value: { type: 'var', value: 'stream' } },
        },
      },
    })
  })

  test('parses slice subscripts including reverse slices', () => {
    const result = parseWithContext('mask[prediction == index] = color[::-1]')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'assign',
      slots: {
        target: {
          type: 'subscriptExpr',
        },
        value: {
          type: 'subscriptExpr',
          slots: {
            value: { type: 'var', value: 'color' },
            index: { type: 'sliceExpr' },
          },
        },
      },
    })
    expect(result[0].slots.value.slots.index.slots.start).toBeNull()
    expect(result[0].slots.value.slots.index.slots.end).toBeNull()
    expect(result[0].slots.value.slots.index.slots.step).toMatchObject({
      type: 'binOp',
      op: '-',
    })
  })

  test('parses multidimensional subscript indices and mixed slices', () => {
    const result = parseWithContext('tp = cm[i, i]\nfp = cm[:, i].sum() - tp\nfn = cm[i, :].sum() - tp')

    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({
      type: 'assign',
      slots: {
        target: { type: 'var', value: 'tp' },
        value: {
          type: 'subscriptExpr',
          slots: {
            value: { type: 'var', value: 'cm' },
            index: { type: 'tupleExpr' },
          },
        },
      },
    })
    expect(result[0].slots.value.slots.index.args).toEqual([
      { type: 'var', value: 'i' },
      { type: 'var', value: 'i' },
    ])

    expect(result[1]).toMatchObject({
      type: 'assign',
      slots: {
        target: { type: 'var', value: 'fp' },
        value: {
          type: 'binOp',
          op: '-',
          slots: {
            left: {
              type: 'callExpr',
              slots: {
                callee: {
                  type: 'memberExpr',
                  name: 'sum',
                },
              },
            },
            right: { type: 'var', value: 'tp' },
          },
        },
      },
    })
    expect(result[1].slots.value.slots.left.slots.callee.slots.value).toMatchObject({
      type: 'subscriptExpr',
      slots: {
        value: { type: 'var', value: 'cm' },
        index: { type: 'tupleExpr' },
      },
    })
    expect(result[1].slots.value.slots.left.slots.callee.slots.value.slots.index.args[0]).toMatchObject({
      type: 'sliceExpr',
    })
    expect(result[1].slots.value.slots.left.slots.callee.slots.value.slots.index.args[1]).toMatchObject({
      type: 'var',
      value: 'i',
    })

    expect(result[2]).toMatchObject({
      type: 'assign',
      slots: {
        target: { type: 'var', value: 'fn' },
        value: {
          type: 'binOp',
          op: '-',
        },
      },
    })
    const finalIndexArgs = result[2].slots.value.slots.left.slots.callee.slots.value.slots.index.args
    expect(finalIndexArgs[0]).toMatchObject({ type: 'var', value: 'i' })
    expect(finalIndexArgs[1]).toMatchObject({ type: 'sliceExpr' })
  })

  test('parses formatted string arguments', () => {
    const result = parseWithContext('f.write(f"Mean IoU: {mean_iou:.4f}\\n")')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'callStmt',
      slots: {
        callee: {
          type: 'memberExpr',
          name: 'write',
          slots: {
            value: { type: 'var', value: 'f' },
          },
        },
      },
    })
    expect(result[0].args[0]).toMatchObject({
      type: 'formatStr',
      value: 'Mean IoU: {mean_iou:.4f}\\n',
      tripleQuoted: false,
    })
  })

  test('parses raw strings and triple-quoted formatted strings', () => {
    const result = parseWithContext('path = r"C:\\tmp\\x"\npattern = r"""\\d+\\n{name}"""\nmessage = f"""Hello {name}"""')

    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({
      type: 'assign',
      slots: {
        target: { type: 'var', value: 'path' },
        value: { type: 'rawStr', value: 'C:\\tmp\\x', tripleQuoted: false },
      },
    })
    expect(result[1]).toMatchObject({
      type: 'assign',
      slots: {
        target: { type: 'var', value: 'pattern' },
        value: { type: 'rawStr', value: '\\d+\\n{name}', tripleQuoted: true },
      },
    })
    expect(result[2]).toMatchObject({
      type: 'assign',
      slots: {
        target: { type: 'var', value: 'message' },
        value: { type: 'formatStr', value: 'Hello {name}', tripleQuoted: true },
      },
    })
  })

  test('accepts valid quote-only triple strings', () => {
    const result = parseWithContext('print(""""""")')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'print',
      slots: {
        value: { type: 'longStr', value: '"' },
      },
    })
  })

  test('preserves keyword arguments in qualified calls', () => {
    const result = parseWithContext('logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'callStmt',
      slots: {
        callee: {
          type: 'memberExpr',
          name: 'basicConfig',
          slots: {
            value: { type: 'var', value: 'logging' },
          },
        },
      },
    })
    expect(result[0].args).toEqual([
      { type: 'rawExpr', value: 'level=logging.INFO' },
      { type: 'rawExpr', value: 'format="%(asctime)s - %(message)s"' },
    ])
  })

  test('preserves trailing comments after statements', () => {
    const result = parseWithContext('load_dotenv()  # Load environment variables from .env file')

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      type: 'callStmt',
      name: 'load_dotenv',
      args: [],
    })
    expect(result[1]).toMatchObject({
      type: 'commentStmt',
      value: 'Load environment variables from .env file',
    })
  })

  test('keeps hash characters inside strings', () => {
    const result = parseWithContext('message = "# not a comment"')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'assign',
      slots: {
        target: { type: 'var', value: 'message' },
        value: { type: 'str', value: '# not a comment' },
      },
    })
  })

  test('parses standalone multiline string expressions', () => {
    const result = parseWithContext('"""test\nasdf"""')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'exprStmt',
      slots: {
        value: { type: 'longStr', value: 'test\nasdf' },
      },
    })
  })

  test('parses decorated classes with annotated fields', () => {
    const result = parseWithContext('@dataclass\nclass TrainArgs:\n    """Arguments for training."""\n\n    comment: str')

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      type: 'decoratorStmt',
      value: 'dataclass',
    })
    expect(result[1]).toMatchObject({
      type: 'classDef',
      name: 'TrainArgs',
    })
    expect(result[1].body).toHaveLength(2)
    expect(result[1].body[0]).toMatchObject({
      type: 'exprStmt',
      slots: {
        value: { type: 'longStr', value: 'Arguments for training.' },
      },
    })
    expect(result[1].body[1]).toMatchObject({
      type: 'annAssign',
      annotation: 'str',
      slots: {
        target: { type: 'var', value: 'comment' },
        value: null,
      },
    })
  })

  test('parses conditional expressions in assignments', () => {
    const result = parseWithContext('metric_value_out = None if not np.isfinite(metric_value) else float(metric_value)')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'assign',
      slots: {
        target: { type: 'var', value: 'metric_value_out' },
        value: {
          type: 'conditionalExpr',
          slots: {
            whenTrue: { type: 'var', value: 'None' },
            condition: {
              type: 'not',
              slots: {
                value: {
                  type: 'callExpr',
                  slots: {
                    callee: {
                      type: 'memberExpr',
                      name: 'isfinite',
                    },
                  },
                },
              },
            },
            whenFalse: { type: 'callExpr', name: 'float' },
          },
        },
      },
    })
    expect(result[0].slots.value.slots.condition.slots.value.args).toEqual([
      { type: 'var', value: 'metric_value' },
    ])
    expect(result[0].slots.value.slots.whenFalse.args).toEqual([
      { type: 'var', value: 'metric_value' },
    ])
  })

  test('parses the user while-loop example', () => {
    const result = parseWithContext('x = 0\nwhile (x < 10):\n x = x + 1')

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      type: 'assign',
      slots: {
        target: { type: 'var', value: 'x' },
        value: { type: 'num', value: '0' },
      },
    })

    expect(result[1]).toMatchObject({
      type: 'while',
      slots: {
        condition: {
          type: 'compare',
          op: '<',
          slots: {
            left: { type: 'var', value: 'x' },
            right: { type: 'num', value: '10' },
          },
        },
      },
    })

    expect(result[1].body).toHaveLength(1)
    expect(result[1].body[0]).toMatchObject({
      type: 'assign',
      slots: {
        target: { type: 'var', value: 'x' },
        value: {
          type: 'binOp',
          op: '+',
          slots: {
            left: { type: 'var', value: 'x' },
            right: { type: 'num', value: '1' },
          },
        },
      },
    })
  })

  test('parses shared leading indentation from pasted code', () => {
    const result = parseWithContext('    x = 0\n    while x < 2:\n        x += 1')

    expect(result).toHaveLength(2)
    expect(result[0].type).toBe('assign')
    expect(result[1].type).toBe('while')
    expect(result[1].body[0]).toMatchObject({
      type: 'augAssign',
      op: '+',
    })
  })

  test('parses functions with if else and return', () => {
    const result = parseWithContext(
      'def factorial(n):\n    if n <= 1:\n        return 1\n    else:\n        return factorial(n)',
    )

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'funcDef',
      name: 'factorial',
      params: ['n'],
    })
    expect(result[0].body).toHaveLength(1)
    expect(result[0].body[0].type).toBe('if')
    expect(result[0].body[0].elseBody).toHaveLength(1)
    expect(result[0].body[0].elseBody[0]).toMatchObject({
      type: 'return',
      slots: {
        value: {
          type: 'callExpr',
          name: 'factorial',
        },
      },
    })
  })

  test('parses sequential returns, escaped quotes, and formatted output', () => {
    const result = parseWithContext(
      'def name_getter():\n    return "Reto"\n    return input("What is your\\" name")\nname = name_getter()\nprint(f"Hello {name}")',
    )

    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({
      type: 'funcDef',
      name: 'name_getter',
      params: [],
    })
    expect(result[0].body).toHaveLength(2)
    expect(result[0].body[0]).toMatchObject({
      type: 'return',
      slots: {
        value: { type: 'str', value: 'Reto' },
      },
    })
    expect(result[0].body[1]).toMatchObject({
      type: 'return',
      slots: {
        value: {
          type: 'callExpr',
          name: 'input',
        },
      },
    })
    expect(result[0].body[1].slots.value.args[0]).toMatchObject({
      type: 'str',
      value: 'What is your" name',
    })
    expect(result[1]).toMatchObject({
      type: 'assign',
      slots: {
        target: { type: 'var', value: 'name' },
        value: { type: 'callExpr', name: 'name_getter' },
      },
    })
    expect(result[2]).toMatchObject({
      type: 'print',
      slots: {
        value: { type: 'formatStr', value: 'Hello {name}', tripleQuoted: false },
      },
    })
  })

  test('parses is none comparisons', () => {
    const result = parseWithContext(
      'def main(checkpoint_path, dataset_path, save_path):\n    if dataset_path is None:\n        pass',
    )

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'funcDef',
      name: 'main',
      params: ['checkpoint_path', 'dataset_path', 'save_path'],
    })
    expect(result[0].body[0]).toMatchObject({
      type: 'if',
      slots: {
        condition: {
          type: 'compare',
          op: 'is',
          slots: {
            left: { type: 'var', value: 'dataset_path' },
            right: { type: 'var', value: 'None' },
          },
        },
      },
    })
  })

  test('parses class definitions with bases', () => {
    const result = parseWithContext('class Child(BaseOne, BaseTwo):\n    def __init__(self):\n        self.a = 1')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'classDef',
      name: 'Child',
    })
    expect(result[0].args).toHaveLength(2)
    expect(result[0].args[0]).toMatchObject({ type: 'var', value: 'BaseOne' })
    expect(result[0].args[1]).toMatchObject({ type: 'var', value: 'BaseTwo' })
    expect(result[0].body[0]).toMatchObject({
      type: 'funcDef',
      name: '__init__',
      params: ['self'],
    })
    expect(result[0].body[0].body[0]).toMatchObject({
      type: 'assign',
      slots: {
        target: {
          type: 'memberExpr',
          name: 'a',
          slots: {
            value: { type: 'var', value: 'self' },
          },
        },
      },
    })
  })

  test('parses lambda expressions in assignments', () => {
    const result = parseWithContext('inc = lambda x: x + 1')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'assign',
      slots: {
        target: { type: 'var', value: 'inc' },
        value: {
          type: 'lambda',
          params: ['x'],
        },
      },
    })
    expect(result[0].slots.value.slots.value).toMatchObject({
      type: 'binOp',
      op: '+',
    })
  })

  test('parses raise statements with causes', () => {
    const result = parseWithContext('raise ValueError("dataset_path is required") from err')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'raiseStmt',
      slots: {
        value: { type: 'callExpr', name: 'ValueError' },
        cause: { type: 'var', value: 'err' },
      },
    })
  })

  test('parses with statements', () => {
    const result = parseWithContext('with torch.no_grad() as guard:\n    prediction = model(batch)')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'withStmt',
      withAliases: ['guard'],
    })
    expect(result[0].args).toHaveLength(1)
    expect(result[0].args[0]).toMatchObject({
      type: 'callExpr',
      slots: {
        callee: {
          type: 'memberExpr',
          name: 'no_grad',
        },
      },
    })
    expect(result[0].body[0]).toMatchObject({ type: 'assign' })
  })

  test('parses match case statements', () => {
    const result = parseWithContext('match model_size:\n    case "tiny":\n        width = 64\n    case _:\n        width = 128')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'matchStmt',
      slots: {
        subject: { type: 'var', value: 'model_size' },
      },
    })
    expect(result[0].matchCases).toHaveLength(2)
    expect(result[0].matchCases[0]).toMatchObject({ pattern: '"tiny"', guard: '' })
    expect(result[0].matchCases[1]).toMatchObject({ pattern: '_', guard: '' })
    expect(result[0].matchCases[0].body[0]).toMatchObject({ type: 'assign' })
  })

  test('parses try except else finally with multiple handlers', () => {
    const result = parseWithContext(
      'try:\n    risky()\nexcept ValueError as err:\n    handle_value(err)\nexcept TypeError:\n    handle_type()\nelse:\n    cleanup()\nfinally:\n    done()',
    )

    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('try')
    expect(result[0].exceptHandlers).toHaveLength(2)
    expect(result[0].exceptHandlers[0]).toMatchObject({ type: 'ValueError', alias: 'err' })
    expect(result[0].exceptHandlers[1]).toMatchObject({ type: 'TypeError', alias: '' })
    expect(result[0].showElse).toBe(true)
    expect(result[0].showFinally).toBe(true)
  })

  test('parses method calls on dotted names', () => {
    const result = parseWithContext('obj.inc(x)')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'callStmt',
      slots: {
        callee: {
          type: 'memberExpr',
          name: 'inc',
          slots: {
            value: { type: 'var', value: 'obj' },
          },
        },
      },
    })
    expect(result[0].args[0]).toMatchObject({ type: 'var', value: 'x' })
  })

  test('parses calls on member expressions with subscript bases', () => {
    const result = parseWithContext('value = checkpoint["args"].get("resolution", default_value)')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'assign',
      slots: {
        target: { type: 'var', value: 'value' },
        value: {
          type: 'callExpr',
          slots: {
            callee: {
              type: 'memberExpr',
              name: 'get',
            },
          },
        },
      },
    })
    expect(result[0].slots.value.args).toHaveLength(2)
  })

  test('parses print and input assignments', () => {
    const result = parseWithContext('name = input("Who?")\nprint(name)')

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      type: 'input',
      slots: {
        target: { type: 'var', value: 'name' },
        prompt: { type: 'str', value: 'Who?' },
      },
    })
    expect(result[1]).toMatchObject({
      type: 'print',
      slots: {
        value: { type: 'var', value: 'name' },
      },
    })
  })

  test('parses generic for loops', () => {
    const result = parseWithContext('for i in items:\n    print(i)')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'for',
      slots: {
        var: { type: 'var', value: 'i' },
        iterable: { type: 'var', value: 'items' },
      },
    })
  })

  test('parses tuple-unpacked generic for loops', () => {
    const result = parseWithContext('for i, batch in enumerate(loader):\n    print(batch)')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'for',
      slots: {
        var: { type: 'tupleExpr' },
        iterable: { type: 'callExpr', name: 'enumerate' },
      },
    })
    expect(result[0].slots.var.args).toHaveLength(2)
    expect(result[0].slots.var.args[0]).toMatchObject({ type: 'var', value: 'i' })
    expect(result[0].slots.var.args[1]).toMatchObject({ type: 'var', value: 'batch' })
  })

  test('reports obvious PowerShell input clearly', () => {
    expect(() => parsePythonToBlocks('$path = Join-Path $scriptDir "config.psd1"')).toThrow(
      /looks like PowerShell, not Python/i,
    )
  })

  test('parses the full stress_test.py file', () => {
    const source = readWorkspacePythonFile('stress_test.py')

    expect(() => parsePythonToBlocks(source)).not.toThrow()
  })
})
