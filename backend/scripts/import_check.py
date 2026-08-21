"""Quick import check for the specific router file to avoid importing full package dependencies."""
import pathlib
import ast

router_path = pathlib.Path(__file__).resolve().parents[1] / 'app' / 'routers' / 'project.py'
with open(router_path, 'r', encoding='utf-8') as f:
	source = f.read()
try:
	ast.parse(source)
	print('Project router syntax OK (AST parsed)')
except SyntaxError as se:
	print('SyntaxError parsing router:', se)
	raise
