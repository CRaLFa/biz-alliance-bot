SYSTEMD_DIR := /etc/systemd/system

.PHONY: install uninstall

install:
	@ install -t $(SYSTEMD_DIR) -m 644 ./biz-alliance-bot.service
	@ systemctl daemon-reload
	@ systemctl enable --now biz-alliance-bot.service
	@ echo 'Installation completed.'

uninstall:
	@ systemctl disable --now biz-alliance-bot.service
	@ $(RM) $(SYSTEMD_DIR)/biz-alliance-bot.service
	@ systemctl daemon-reload
	@ echo 'Uninstallation completed.'
