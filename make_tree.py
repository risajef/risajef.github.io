import os
import subprocess as sub

ls = [f for f in os.listdir(os.getcwd()) if f.endswith('html')]

queue = ["index_raw"]

print(ls)

