import os

ls = os.listdir(os.getcwd())
htmlfiles = [f for f in ls if f.endswith(".html")]

words = 0
words_per_page = 300
words_per_book = 60000

for htmlfile in htmlfiles:
    file = open(htmlfile)
    content = file.readlines()
    content = " ".join(content)
    while(content.find("<") != -1):
        content = content[content.find(">")+1:]
        temp_string = content[:content.find("<")]
        temp_string = temp_string.split(" ")
        temp_string = [s for s in temp_string if not(s == '\n' or s == '')]
        words += len(temp_string)
    file.close()
print("words: " + str(words))
print("pages: " + str(words / float(words_per_page)))
print("200 pages book: " + str(words / float(words_per_book)))



