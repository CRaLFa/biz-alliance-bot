SYSTEMD_DIR := /etc/systemd/system

.PHONY: install uninstall

install:
	@ install -t $(SYSTEMD_DIR) -m 644 ./biz-alliance-bot.service ./biz-alliance-bot.timer
	@ systemctl daemon-reload
	@ systemctl enable --now biz-alliance-bot.timer
	@ echo 'Installation completed.'

uninstall:
	@ systemctl disable --now biz-alliance-bot.timer
	@ $(RM) $(SYSTEMD_DIR)/biz-alliance-bot.service $(SYSTEMD_DIR)/biz-alliance-bot.timer
	@ systemctl daemon-reload
	@ echo 'Uninstallation completed.'
