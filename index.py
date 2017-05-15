from html_gen import *
import css_gen as css 
f = open("index.html", 'w')


def myJoin(List = []):
    return '\n'.join(List)

content = html(
    head(
        style(
            css.head(
                ("body",
                    ("font-family","sans-serif"),
                    ("text-decoration", "none")
                ),
                ("div",
                    ("width", "80%"),
                    ("background-color","#b0b0b0"),
                    ("margin","auto"),
                    ("padding","20px")
                 ), 
                ("h1",
                    ("text-decoration", "underline")
                )
            )
        )
    ),
    
    body(
        div(
            h1("Welcome on my GitHub Homepage."),
            p("Feel free to just continue to ", a(("href","https://github.com/risajef"),"my GitHub")),
            p("This page was created on my own writen html generator. I can write something similar to html in python and this is what gets generated. If you are interested in this go on my",
                a(("href","https://github.com/risajef/risajef.github.io"), "repository for the webpage.")),
            p("At the moment it is not such a beautiful solution but at least you can do something like the following:"),
            myJoin([p("Test Paragraph: " + str(i)) for i in range(5)]),
            p("This is a python list-comprehension and not coded by hand. At the moment I am limited by the fact that I don't know how to make my own controlflow objects or something like that."),
            table( css.style(("border","solid"),("background-color","gray")),
                tr(
                    td("This is a Table."), td("This is the second cell.")
                ),
                tr(
                    td(), td("This is the second row an second collum")
                )
            ),
            p("It supports html and css at the moment.")
        )
    )
)

f.write(content)
f.close()