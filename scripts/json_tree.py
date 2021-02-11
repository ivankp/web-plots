#!/usr/bin/env python3

import os, json

def list_path(path):
    if os.path.isdir(path):
        tree = { }
        for x in os.listdir(path):
            l = list_path(os.path.join(path,x))
            if l:
                tree[x] = l
        return tree
    elif path.endswith('.json'):
        return os.path.getsize(path)
    return tree

with open('data_tree.json','w') as o:
    json.dump(list_path('data'),o,sort_keys=True,separators=(',',':'))
