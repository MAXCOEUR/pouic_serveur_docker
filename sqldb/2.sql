DROP TABLE IF EXISTS `messages_pouireal`;
DROP TABLE IF EXISTS `reactions_pouireal`;
DROP TABLE IF EXISTS `pouireal`;
DROP TABLE IF EXISTS `timePouireal`;

CREATE TABLE `timePouireal` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `date` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE `pouireal` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uniquePseudo_sender` varchar(80) NOT NULL,
  `description` text NOT NULL DEFAULT "",
  `date` datetime NOT NULL,
  `linkPicture1` text DEFAULT NULL,
  `linkPicture2` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pouireal->user_idx` (`uniquePseudo_sender`),
  CONSTRAINT `pouireal->user` FOREIGN KEY (`uniquePseudo_sender`) REFERENCES `user` (`uniquePseudo`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `reactions_pouireal` (
  `pouireal_id` int unsigned NOT NULL,
  `user_uniquePseudo` varchar(80) NOT NULL,
  `emoji` char(10) NOT NULL,
  PRIMARY KEY (`user_uniquePseudo`,`pouireal_id`),
  KEY `reactions_pouireal->pouireal_idx` (`pouireal_id`),
  CONSTRAINT `reactions_pouireal->pouireal` FOREIGN KEY (`pouireal_id`) REFERENCES `pouireal` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `reactions_pouireal->user` FOREIGN KEY (`user_uniquePseudo`) REFERENCES `user` (`uniquePseudo`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB;

CREATE TABLE `messages_pouireal` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uniquePseudo_sender` varchar(80) NOT NULL,
  `Message` text DEFAULT NULL,
  `date` datetime NOT NULL DEFAULT current_timestamp(),
  `id_pouireal` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `messages_pouireal->user_idx` (`uniquePseudo_sender`),
  KEY `messages_pouireal->idx_pouireal` (`id_pouireal`),
  CONSTRAINT `messages_pouireal->pouireal` FOREIGN KEY (`id_pouireal`) REFERENCES `pouireal` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `messages_pouireal->user` FOREIGN KEY (`uniquePseudo_sender`) REFERENCES `user` (`uniquePseudo`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

DELIMITER ;;
CREATE DEFINER=`maxence`@`%` PROCEDURE `CreatePouireal`(
  IN uniquePseudo VARCHAR(80),
  IN description TEXT,
  IN date DateTime
)
BEGIN
    DECLARE new_messages_id INT;

    insert into pouireal(uniquePseudo_sender,description,date) values (uniquePseudo,description,date);

  
    SET new_messages_id = LAST_INSERT_ID();
  
  
    SELECT * FROM pouireal natural join user where pouireal.id=new_messages_id;
END;;
DELIMITER ;

DELIMITER ;;
CREATE DEFINER=`maxence`@`%` PROCEDURE `setReaction_pouireal`(
    IN p_pouireal_id INT UNSIGNED,
    IN p_user_uniquePseudo VARCHAR(80),
    IN p_emoji CHAR(10)
)
BEGIN
    DECLARE v_existing_row_count INT;

    -- Vérifiez s'il existe déjà une ligne avec les clés primaires fournies
    SELECT COUNT(*) INTO v_existing_row_count
    FROM reactions_pouireal
    WHERE pouireal_id = p_pouireal_id AND user_uniquePseudo = p_user_uniquePseudo;

    IF v_existing_row_count > 0 THEN
        -- Si une ligne existe, mettez à jour l'emoji
        UPDATE reactions_pouireal
        SET emoji = p_emoji
        WHERE pouireal_id = p_pouireal_id AND user_uniquePseudo = p_user_uniquePseudo;
    ELSE
        -- Si aucune ligne n'existe, insérez une nouvelle ligne
        INSERT INTO reactions_pouireal (pouireal_id, user_uniquePseudo, emoji)
        VALUES (p_pouireal_id, p_user_uniquePseudo, p_emoji);
    END IF;

    -- Retournez la jointure avec la table "user"
    SELECT r.pouireal_id,r.emoji, user.* -- Sélectionnez les colonnes nécessaires
    FROM reactions_pouireal r
    INNER JOIN user ON r.user_uniquePseudo = user.uniquePseudo
    WHERE r.pouireal_id = p_pouireal_id AND r.user_uniquePseudo = p_user_uniquePseudo;
END;;
DELIMITER ;