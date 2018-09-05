import os
import subprocess as sub

ls = [f for f in os.listdir(os.getcwd()) if f.endswith('html')]

seen = {a : False for a in ls}

queue = ["index.html"]



print(htmlfiles)

