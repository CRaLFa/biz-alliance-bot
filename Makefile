SYSTEMD_DIR := /etc/systemd/system

.PHONY: install uninstall

install:
	@ install -t $(SYSTEMD_DIR) -m 644 ./tdnet-bot.service
	@ systemctl daemon-reload
	@ systemctl enable --now tdnet-bot.service
	@ echo 'Installation completed.'

uninstall:
	@ systemctl disable --now tdnet-bot.service
	@ $(RM) $(SYSTEMD_DIR)/tdnet-bot.service
	@ systemctl daemon-reload
	@ echo 'Uninstallation completed.'
