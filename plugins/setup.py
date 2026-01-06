"""Setup file for the multilingual plugin."""
from setuptools import setup, find_packages

setup(
    name='mkdocs-multilingual-plugin',
    version='0.1.0',
    description='MkDocs plugin for multilingual support with auto-translation',
    author='Reto Weber',
    py_modules=['multilingual_plugin'],
    install_requires=[
        'mkdocs>=1.0',
        'argostranslate>=1.9.0',
        'PyYAML>=6.0',
    ],
    entry_points={
        'mkdocs.plugins': [
            'multilingual = multilingual_plugin:MultilingualPlugin',
        ]
    }
)
