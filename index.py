from html_gen import *
f = open("index.html", 'w')

def code(Str = '<html></html>'):
    Str = Str.replace("    ", "&nbsp;&nbsp;&nbsp;&nbsp;")
    Str = Str.replace("'\n'", "<placeholder>")
    Str = Str.replace("\n", "</br>\n    ")
    Str = Str.replace("<placeholder>", "\'\\n\'")
    returnString = "<code>\n    "
    returnString = returnString + Str
    returnString = returnString + "\n</code>"
    return(returnString)



content = html(
    body(
        h1("Welcome on my GitHub Homepage."),
        p("Feel free to just continue to ", a(("href","https://github.com/risajef"),"my GitHub")),
        p("This page was created on my own writen html generator. I can write something similar to html in python and this is what gets generated. If you are interested in this go on my",
            a(("href","https://github.com/risajef/risajef.github.io"), "repository for the webpage.")),
        p("At the moment it is not such a beautiful solution but at least you can do something like the following:"),
        '\n'.join([p("Test Paragraph: " + str(i)) for i in range(5)]),
        p("This is a python list-comprehension and not coded by hand. At the moment I am limited by the fact that I don't know how to make my own controlflow objects or something like that."),
        p("Here I show you how this code looks like. You can go to the source code to look what it really generated"),
        code("""from html_gen import *
f = open("index.html", 'w')

content = html(
    body(
        h1("Welcome on my GitHub Homepage."),
        p("Feel free to just continue to ", a(("href","https://github.com/risajef"),"my GitHub")),
        p("This page was created on my own writen html generator. I can write something similar to html in python and this is what gets generated. If you are interested in this go on my",
            a(("href","https://github.com/risajef/risajef.github.io"), "repository for the webpage.")),
        p("At the moment it is not such a beautiful solution but at least you can do something like the following:"),
        '\n'.join([p("Test Paragraph: " + str(i)) for i in range(5)]),
        p("This is a python list-comprehension and not coded by hand. At the moment I am limited by the fact that I don't know how to make my own controlflow objects or something like that."),
        p("Here I show you how this code looks like. You can go to the source code to look what it really generated")
        code("")
    )
)

f.write(content)
f.close()""")
    )
)

f.write(content)
f.close()