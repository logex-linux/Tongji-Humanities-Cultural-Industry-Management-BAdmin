"""Regression cases for escaped dollar signs and mathematical/code boundaries."""
import unittest
from merge import render


class RenderingTests(unittest.TestCase):
    def test_literal_dollar_inside_math(self):
        result=render(r'终结符 $\{id, \$\}$，随后 $A$。','case')
        self.assertEqual(result.count('data-tex='),2)
        self.assertIn(r'\{id, \$\}',result)
        self.assertNotIn('CODETOKEN',result)

    def test_no_dollar_prose_swallowing(self):
        result=render('数学 $\\$$。\n\n## 下面的段落\n\n另一个 $A$。','case')
        self.assertEqual(result.count('data-tex='),2)
        self.assertIn('<h2',result)

    def test_multiline_display(self):
        result=render('\\[\nx^2 +\ny^2\n\\]\n\n末尾 $z$','case')
        self.assertEqual(result.count('data-tex='),2)
        self.assertIn('data-display="1"',result)

    def test_inline_code_is_literal(self):
        result=render('`$x$` 与 $y$','case')
        self.assertEqual(result.count('data-tex='),1)
        self.assertIn('<code>$x$</code>',result)

    def test_fenced_code_is_literal(self):
        result=render('```python\nprint("$x$")\n```\n\n$y$','case')
        self.assertEqual(result.count('data-tex='),1)
        self.assertIn('language-python',result)

    def test_less_than_is_not_html(self):
        result=render(r'\(x<y\)','case')
        self.assertIn('x&lt;y',result)
        self.assertNotIn('<y',result)

    def test_no_executable_markup(self):
        result=render('<script>alert(1)</script><a href="javascript:alert(1)" onclick="alert(1)">x</a>','case')
        self.assertNotIn('<script',result)
        self.assertNotIn('onclick',result)
        self.assertNotIn('javascript:',result)


if __name__=='__main__':
    unittest.main()
