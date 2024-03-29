# Minimal makefile for Sphinx documentation
#

# You can set these variables from the command line, and also
# from the environment for the first two.
SPHINXBUILD   ?= sphinx-build
SOURCEDIR     = source
GIT_BRANCH    :=$(shell git rev-parse --abbrev-ref HEAD)
BUILDDIR      = build
SPHINXOPTS    = -d $(BUILDDIR)/doctrees 
SOURCECOPYDIR = $(BUILDDIR)/source/

# Will need later for scrubbing generated .md files
MY_OS         :=$(shell uname)
# In Makefile, spaces and everything count inside if parens()
ifeq ($(MY_OS),Darwin)
	IS_MAC="DEFINED"
endif

# Put it first so that "make" without argument is like "make help".
help:
	@$(SPHINXBUILD) -M help "$(SOURCECOPYDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)


.PHONY: help clean Makefile migrate html

clean:
	if [ -d $(BUILDDIR) ]; then rm -rf $(BUILDDIR) ; fi;
	if [ -d build/docs-assets ]; then rm -rf build/docs-assets ; fi;

migrate: clean
	mkdir -p $(SOURCECOPYDIR)

   # Using https (not ssh) to clone
	git clone https://github.com/inrupt/docs-assets.git build/docs-assets


	# Copying to SOURCECOPYDIR instead of copying source dir to BUILDDIR
   # in case someone forgets to backslash after build/

	cp -R $(SOURCEDIR)/api/* $(SOURCECOPYDIR)

	# Temporary workaround for the functions being in the generated index.rst (which is the README.md file) instead of a separate module
   # We'll just put the functions in a functions.md file 

	cp -R $(SOURCEDIR)/functions.md $(SOURCECOPYDIR)
	
	if [ -f $(SOURCECOPYDIR)index.rst ]; then \
	   sed  -n -e '/Functions/,$$p' $(SOURCECOPYDIR)index.rst >> $(SOURCECOPYDIR)functions.md ; \
	   sed -i '' -e 's/index\.rst/functions\.md/g' $(SOURCECOPYDIR)functions.md ; \
	   rm $(SOURCECOPYDIR)index.rst ; \
	fi
	
	# Use our custom index.rst
	cp -R $(SOURCEDIR)/index.rst $(SOURCECOPYDIR)
	

html: Makefile migrate

# To clean up refs in markdown, 
# If making html (e.g. foo.html), use sed to change .md# to .html#
# Also, on macOS, need -i '' but not for Linux

# ifdef IS_MAC
# 	find $(SOURCECOPYDIR)/ -type f -name "*.md" -exec sed -i '' -e 's?\.md#?\.html#?g' {} \;
#
# else
# 	find $(SOURCECOPYDIR)/ -type f -name "*.md" -exec sed -i  -e 's?\.md#?\.html#?g' {} \;
# endif
	@$(SPHINXBUILD) -M $@ "$(SOURCECOPYDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O) -c .

# Catch-all target: route all unknown targets to Sphinx using the new
# "make mode" option.  $(O) is meant as a shortcut for $(SPHINXOPTS).
%: Makefile migrate
	@$(SPHINXBUILD) -M $@ "$(SOURCECOPYDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O) -c .



	

