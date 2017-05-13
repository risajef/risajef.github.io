from html_gen import *
f = open("index.html", 'w')

c = ""

for i in range(5):
    c = c + p("Test Paragraph: " + str(i))

content = html(
    body(
        p(("color","red"), ("href","http://google.ch"), "Test Paragraph: 1"),
        p("Test Paragraph: 2")
    )
)

content = html(
    body(
        h1("Welcome on my GitHub Homepage."),
        p("Feel free to just continue to ", a(("href","https://github.com/risajef"),"my GitHub")),
        p("This page was created on my own writen html generator. I can write something similar to html in python and this is what gets generated. If you are interested in this go on my",
            a(("href","https://github.com/risajef/risajef.github.io"), "repository for the webpage.")),
        p("At the moment it is not such a beautiful solution but at least you can do something like the following:"),
        '\n'.join([p("Test Paragraph: " + str(i)) for i in range(5)]),
        p("This is a python list-comprehension and not coded by hand. At the moment I am limited by the fact that I don't know how to make my own controlflow objects or something like that.")
    )
)

f.write(content)
f.close()