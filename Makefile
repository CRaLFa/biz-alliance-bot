SYSTEMD_DIR := /etc/systemd/system

.PHONY: install uninstall

install:
	@ install -t $(SYSTEMD_DIR) -m 644 ./biz-alliance-bot.service ./biz-alliance-bot.timer
	@ systemctl daemon-reload
	@ echo 'Installation completed.'

uninstall:
	@ $(RM) $(SYSTEMD_DIR)/biz-alliance-bot.service $(SYSTEMD_DIR)/biz-alliance-bot.timer
	@ systemctl daemon-reload
	@ echo 'Uninstallation completed.'
