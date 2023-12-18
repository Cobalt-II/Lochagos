# Lochagos
A Webassembly text format (wat) to JavaScript converter. It's specifically built for browser wasm files in order to help with io game scripting and reverse engineering. The js file can be run in devtools or anywhere else even. To use, simply copy Lochagos.js and input the wat file in the string dedicated for it (only exclude metadata line because strings don't like \8s and \9s). Then get the specific func in the file you want to convert to JavaScript and put it into its dedicated string, note that if you are converting an export func, just remove the stuff that show something like this: (;516;) (export "LK"). Then simply run the code. It'll output a lumped together ball of js code which can be put into a beautifier for a js conversion of the wasm func.


