
f = open("html_gen.py", 'w')
# "del"
tags = ["a","abbr","acronym","address","applet","area","article","aside","audio","b","base","basefont","bdi","bdo","big","blockquote","body","br","button","canvas","caption","center","cite","code","col","colgroup","datalist","dd","details","dfn","dialog","dir","div","dl","dt","em","embed","fieldset","figcaption","figure","font","footer","form","frame","frameset","h1","head","header","hr","html","i","iframe","img","input","ins","kbd","keygen","label","legend","li","link","main","map","mark","menu","menuitem","meta","meter","nav","noframes","noscript","object","ol","optgroup","option","output","p","param","picture","pre","progress","q","rp","rt","ruby","s","samp","script","section","select","small","source","span","strike","strong","style","sub","summary","sup","table","tbody","td","textarea","tfoot","th","thead","time","title","tr","track","tt","u","ul","var","video","wbr"]
for tag in tags:
    f.write("\ndef " + tag + "(*args):\n")
    f.write("    Str = [a for a in args if type(a) is str]\n")
    f.write("    args = [a for a in args if not(type(a) is str)]\n")
    f.write("    Str = [s.replace(\"\\n\",\"\\n    \") for s in Str]\n")
    f.write("    returnString = \"<" + tag + "\"\n")
    f.write("    if len(args) > 0:\n")
    f.write("        returnString = returnString + \" \"\n")
    f.write("    for a in args:\n")
    f.write("        returnString = returnString + a[0] + \"=\\\"\" + a[1] + \"\\\" \"\n")
    f.write("    returnString = returnString + \">\"\n")
    f.write("    for s in Str:\n")
    f.write("        returnString = returnString + \"\\n    \" + s\n")
    f.write("    returnString = returnString + \"\\n</"+ tag +">\"\n")
    f.write("    return(returnString)\n")
    
f.close()