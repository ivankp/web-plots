#!/usr/bin/env python3

import sys, os, json

if not os.path.isdir('data'):
    print('no directory "data"')
    sys.exit(1)

def list_path(path):
    if os.path.isdir(path):
        tree = { }
        for x in os.listdir(path):
            l = list_path(os.path.join(path,x))
            if l:
                tree[x[:-5] if isinstance(l,int) else x] = l
        return tree
    elif path.endswith('.json'):
        return os.path.getsize(path)
    return None

with open('data_tree.json','w') as o:
    json.dump(list_path('data'),o,sort_keys=True,separators=(',',':'))
