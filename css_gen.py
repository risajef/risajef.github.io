def head(*args):
    args = [a for a in args if type(a) is tuple]
    returnString = ""
    for a in args:
        rules = ""
        for r in a[1:]:
            rules = rules + "\n    " + r[0] + " : " + r[1] + " ;"
        returnString = returnString + a[0] + " {" + rules + "}\n"
    return(returnString)

def style(*args):
    args = [a for a in args if not(type(a) is str)]
    if(len(args) == 1):
        returnString = args[0][0] + " : " + args[0][1] + " ;"
    else:
        returnString = ""
        for a in args:
            returnString = returnString + "\n    " + a[0] + " : " + a[1] + " ;"
    
    returnString = returnString + "\n"
    return(("style",returnString))

