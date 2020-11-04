HOST=gbserver.cs.unc.edu

dev: DOMAIN=test.tarheelgameplay.org
dev: SRC=.
dev: build copy

production: DOMAIN=tarheelgameplay.org
production: SRC=../Theme-build/
production: optimized copy

copy:
	rsync -az --delete --exclude .git --exclude tests/robot $(SRC) $(HOST):/var/www/$(DOMAIN)/theme/

transifex:
	tx pull -f -l es_MX,fr_FR,de,pt_PT,tr,it,zh
	mv languages/fr_FR.po languages/fr.po
	mv languages/pt_PT.po languages/pt.po
	mv languages/es_MX.po languages/es.po

locale/%/LC_MESSAGES/thr.mo: languages/%.po
	mkdir -p $(dir $@)
	msgfmt $< --output-file $@

Templates.en.json: templates/*.html searchForm.json readingForm.json categories.json languages.json ratings.json locales.json
	python tools/BuildTemplate.py -compact --lang=en --output=$@ $^

Templates.%.json: languages/%.po locale/%/LC_MESSAGES/thr.mo templates/*.html searchForm.json readingForm.json categories.json languages.json ratings.json locales.json
	python tools/BuildTemplate.py -compact --lang=$* --output=$@ templates/*.html searchForm.json readingForm.json categories.json languages.json ratings.json locales.json

build: Templates.en.json style.css
	rm -f manifest.appcache

style.css: tools/MakeMediaQueries.py style.scss css/_allmediaqueries.scss css/_classes.scss  css/_mixins.scss css/_reset.scss css/_creator.scss css/_yourbooks.scss css/_gameplay.scss
	python tools/MakeMediaQueries.py > css/_mediaqueries.scss
	sassc --style=compressed style.scss style.css

translate:
	python tools/BuildTemplate.py --lang=en --extract=languages/thr.pot templates/*.html searchForm.json readingForm.json categories.json languages.json ratings.json locales.json

optimized: build
	rm -rf ../Theme-build/*
	node ../r.js -o js/app.build.js
	cp --parents -r *.php *.json js/main-combined.js js/modernizr.custom.js js/require.min.js *.png images style.css Makefile ../Theme-build
	mv ../Theme-build/js/main-combined.js ../Theme-build/js/main.js
	make versioned

versioned:
	cd ../Theme-build; python ../Theme/tools/EditFileVersions.py --used used.txt *.php js/main.js style.css Templates*.json

release:
	make optimized
	cd ../Theme-build; tar czf /home/gb/Sync/gbservers/roles/wordpress/files/thg-theme.bz2 --exclude=.git --exclude=test .

siteSpeech: build
	python tools/makeSiteSpeech.py Templates.*.json
	# if the speech file is too short, the flash player loops, need a better fix than this
	lame --quiet --preset phon+ speech/en-1star-c.mp3 speech/foo.mp3
	mv speech/foo.mp3 speech/en-1star-c.mp3
	lame --quiet --preset phon+ speech/en-1star-f.mp3 speech/foo.mp3
	mv speech/foo.mp3 speech/en-1star-f.mp3
