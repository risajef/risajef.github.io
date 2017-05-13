
def a(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<a"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</a>"
    return(returnString)

def abbr(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<abbr"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</abbr>"
    return(returnString)

def acronym(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<acronym"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</acronym>"
    return(returnString)

def address(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<address"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</address>"
    return(returnString)

def applet(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<applet"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</applet>"
    return(returnString)

def area(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<area"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</area>"
    return(returnString)

def article(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<article"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</article>"
    return(returnString)

def aside(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<aside"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</aside>"
    return(returnString)

def audio(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<audio"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</audio>"
    return(returnString)

def b(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<b"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</b>"
    return(returnString)

def base(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<base"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</base>"
    return(returnString)

def basefont(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<basefont"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</basefont>"
    return(returnString)

def bdi(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<bdi"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</bdi>"
    return(returnString)

def bdo(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<bdo"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</bdo>"
    return(returnString)

def big(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<big"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</big>"
    return(returnString)

def blockquote(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<blockquote"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</blockquote>"
    return(returnString)

def body(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<body"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</body>"
    return(returnString)

def br(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<br"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</br>"
    return(returnString)

def button(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<button"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</button>"
    return(returnString)

def canvas(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<canvas"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</canvas>"
    return(returnString)

def caption(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<caption"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</caption>"
    return(returnString)

def center(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<center"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</center>"
    return(returnString)

def cite(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<cite"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</cite>"
    return(returnString)

def code(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<code"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</code>"
    return(returnString)

def col(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<col"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</col>"
    return(returnString)

def colgroup(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<colgroup"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</colgroup>"
    return(returnString)

def datalist(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<datalist"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</datalist>"
    return(returnString)

def dd(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<dd"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</dd>"
    return(returnString)

def details(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<details"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</details>"
    return(returnString)

def dfn(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<dfn"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</dfn>"
    return(returnString)

def dialog(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<dialog"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</dialog>"
    return(returnString)

def dir(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<dir"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</dir>"
    return(returnString)

def div(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<div"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</div>"
    return(returnString)

def dl(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<dl"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</dl>"
    return(returnString)

def dt(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<dt"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</dt>"
    return(returnString)

def em(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<em"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</em>"
    return(returnString)

def embed(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<embed"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</embed>"
    return(returnString)

def fieldset(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<fieldset"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</fieldset>"
    return(returnString)

def figcaption(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<figcaption"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</figcaption>"
    return(returnString)

def figure(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<figure"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</figure>"
    return(returnString)

def font(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<font"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</font>"
    return(returnString)

def footer(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<footer"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</footer>"
    return(returnString)

def form(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<form"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</form>"
    return(returnString)

def frame(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<frame"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</frame>"
    return(returnString)

def frameset(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<frameset"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</frameset>"
    return(returnString)

def h1(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<h1"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</h1>"
    return(returnString)

def head(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<head"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</head>"
    return(returnString)

def header(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<header"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</header>"
    return(returnString)

def hr(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<hr"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</hr>"
    return(returnString)

def html(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<html"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</html>"
    return(returnString)

def i(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<i"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</i>"
    return(returnString)

def iframe(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<iframe"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</iframe>"
    return(returnString)

def img(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<img"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</img>"
    return(returnString)

def input(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<input"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</input>"
    return(returnString)

def ins(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<ins"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</ins>"
    return(returnString)

def kbd(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<kbd"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</kbd>"
    return(returnString)

def keygen(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<keygen"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</keygen>"
    return(returnString)

def label(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<label"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</label>"
    return(returnString)

def legend(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<legend"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</legend>"
    return(returnString)

def li(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<li"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</li>"
    return(returnString)

def link(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<link"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</link>"
    return(returnString)

def main(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<main"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</main>"
    return(returnString)

def map(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<map"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</map>"
    return(returnString)

def mark(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<mark"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</mark>"
    return(returnString)

def menu(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<menu"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</menu>"
    return(returnString)

def menuitem(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<menuitem"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</menuitem>"
    return(returnString)

def meta(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<meta"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</meta>"
    return(returnString)

def meter(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<meter"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</meter>"
    return(returnString)

def nav(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<nav"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</nav>"
    return(returnString)

def noframes(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<noframes"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</noframes>"
    return(returnString)

def noscript(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<noscript"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</noscript>"
    return(returnString)

def object(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<object"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</object>"
    return(returnString)

def ol(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<ol"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</ol>"
    return(returnString)

def optgroup(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<optgroup"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</optgroup>"
    return(returnString)

def option(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<option"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</option>"
    return(returnString)

def output(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<output"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</output>"
    return(returnString)

def p(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<p"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</p>"
    return(returnString)

def param(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<param"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</param>"
    return(returnString)

def picture(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<picture"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</picture>"
    return(returnString)

def pre(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<pre"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</pre>"
    return(returnString)

def progress(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<progress"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</progress>"
    return(returnString)

def q(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<q"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</q>"
    return(returnString)

def rp(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<rp"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</rp>"
    return(returnString)

def rt(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<rt"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</rt>"
    return(returnString)

def ruby(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<ruby"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</ruby>"
    return(returnString)

def s(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<s"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</s>"
    return(returnString)

def samp(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<samp"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</samp>"
    return(returnString)

def script(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<script"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</script>"
    return(returnString)

def section(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<section"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</section>"
    return(returnString)

def select(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<select"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</select>"
    return(returnString)

def small(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<small"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</small>"
    return(returnString)

def source(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<source"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</source>"
    return(returnString)

def span(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<span"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</span>"
    return(returnString)

def strike(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<strike"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</strike>"
    return(returnString)

def strong(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<strong"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</strong>"
    return(returnString)

def style(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<style"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</style>"
    return(returnString)

def sub(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<sub"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</sub>"
    return(returnString)

def summary(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<summary"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</summary>"
    return(returnString)

def sup(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<sup"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</sup>"
    return(returnString)

def table(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<table"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</table>"
    return(returnString)

def tbody(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<tbody"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</tbody>"
    return(returnString)

def td(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<td"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</td>"
    return(returnString)

def textarea(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<textarea"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</textarea>"
    return(returnString)

def tfoot(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<tfoot"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</tfoot>"
    return(returnString)

def th(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<th"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</th>"
    return(returnString)

def thead(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<thead"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</thead>"
    return(returnString)

def time(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<time"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</time>"
    return(returnString)

def title(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<title"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</title>"
    return(returnString)

def tr(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<tr"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</tr>"
    return(returnString)

def track(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<track"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</track>"
    return(returnString)

def tt(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<tt"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</tt>"
    return(returnString)

def u(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<u"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</u>"
    return(returnString)

def ul(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<ul"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</ul>"
    return(returnString)

def var(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<var"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</var>"
    return(returnString)

def video(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<video"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</video>"
    return(returnString)

def wbr(*args):
    Str = [a for a in args if type(a) is str]
    args = [a for a in args if not(type(a) is str)]
    Str = [s.replace("\n","\n    ") for s in Str]
    returnString = "<wbr"
    if len(args) > 0:
        returnString = returnString + " "
    for a in args:
        returnString = returnString + a[0] + "=\"" + a[1] + "\" "
    returnString = returnString + ">"
    for s in Str:
        returnString = returnString + "\n    " + s
    returnString = returnString + "\n</wbr>"
    return(returnString)
