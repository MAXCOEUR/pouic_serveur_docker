-- MySQL dump 10.13  Distrib 8.0.34, for Win64 (x86_64)
--
-- Host: 192.168.0.168    Database: discution
-- ------------------------------------------------------
-- Server version	5.5.5-10.11.3-MariaDB-1

ALTER SCHEMA `pouic`  DEFAULT COLLATE utf8mb4_unicode_ci;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `email` varchar(255) NOT NULL,
  `uniquePseudo` varchar(80) NOT NULL,
  `pseudo` varchar(80) NOT NULL,
  `passWord` varchar(255) NOT NULL,
  `extension` varchar(4) DEFAULT NULL,
  `bio` varchar(200) DEFAULT NULL,
  `tokenFireBase` varchar(170) DEFAULT NULL,
  PRIMARY KEY (`uniquePseudo`),
  UNIQUE KEY `uniquePseudo_UNIQUE` (`uniquePseudo`),
  UNIQUE KEY `email_UNIQUE` (`email`)
) ENGINE=InnoDB;

--
-- Table structure for table `file`
--

DROP TABLE IF EXISTS `file`;
CREATE TABLE `file` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `id_message` int(11) unsigned DEFAULT NULL,
  `linkFile` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `file->message_idx` (`id_message`)
) ENGINE=InnoDB ;
--
-- Table structure for table `conversation`
--

DROP TABLE IF EXISTS `conversation`;
CREATE TABLE `conversation` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `uniquePseudo_admin` varchar(80) NOT NULL,
  `extension` varchar(4) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `conversation->user_idx` (`uniquePseudo_admin`),
  CONSTRAINT `conversation->user` FOREIGN KEY (`uniquePseudo_admin`) REFERENCES `user` (`uniquePseudo`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;
--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
CREATE TABLE `messages` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uniquePseudo_sender` varchar(80) NOT NULL,
  `Message` text DEFAULT NULL,
  `date` datetime NOT NULL DEFAULT current_timestamp(),
  `id_conversation` int(11) unsigned DEFAULT NULL,
  `id_parent` int(11) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `message->user_idx` (`uniquePseudo_sender`),
  KEY `message->conversation_idx` (`id_conversation`),
  KEY `message->message_idx` (`id_parent`),
  CONSTRAINT `message->conv` FOREIGN KEY (`id_conversation`) REFERENCES `conversation` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `message->messageParent` FOREIGN KEY (`id_parent`) REFERENCES `messages` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `message->user` FOREIGN KEY (`uniquePseudo_sender`) REFERENCES `user` (`uniquePseudo`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB ;
--
-- Table structure for table `amis`
--

DROP TABLE IF EXISTS `amis`;
CREATE TABLE `amis` (
  `demandeur` varchar(80) NOT NULL,
  `receveur` varchar(80) NOT NULL,
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`),
  KEY `amis-user_idx` (`demandeur`,`receveur`),
  KEY `tt_idx` (`receveur`),
  CONSTRAINT `amis-demandeur->user` FOREIGN KEY (`demandeur`) REFERENCES `user` (`uniquePseudo`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `amis-receveur->user` FOREIGN KEY (`receveur`) REFERENCES `user` (`uniquePseudo`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;


--
-- Table structure for table `demandeAmis`
--

DROP TABLE IF EXISTS `demandeAmis`;
CREATE TABLE `demandeAmis` (
  `demandeur` varchar(80) NOT NULL,
  `receveur` varchar(80) NOT NULL,
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`),
  KEY `amis-user_idx` (`demandeur`,`receveur`),
  KEY `tt_idx` (`receveur`),
  CONSTRAINT `demandeAmis-demandeur->user` FOREIGN KEY (`demandeur`) REFERENCES `user` (`uniquePseudo`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `demandeAmis-receveur->user` FOREIGN KEY (`receveur`) REFERENCES `user` (`uniquePseudo`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

--
-- Table structure for table `message-read`
--

DROP TABLE IF EXISTS `message-read`;
CREATE TABLE `message-read` (
  `id_message` int(11) unsigned NOT NULL,
  `uniquePseudo_user` varchar(80) NOT NULL,
  PRIMARY KEY (`id_message`,`uniquePseudo_user`),
  KEY `message-read->user` (`uniquePseudo_user`),
  CONSTRAINT `message->message` FOREIGN KEY (`id_message`) REFERENCES `messages` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `message-read->user` FOREIGN KEY (`uniquePseudo_user`) REFERENCES `user` (`uniquePseudo`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



--
-- Table structure for table `reactions`
--

DROP TABLE IF EXISTS `reactions`;
CREATE TABLE `reactions` (
  `message_id` int(11) unsigned NOT NULL,
  `user_uniquePseudo` varchar(80) NOT NULL,
  `emoji` char(10) NOT NULL,
  PRIMARY KEY (`user_uniquePseudo`,`message_id`),
  KEY `reaction->messages_idx` (`message_id`),
  CONSTRAINT `reaction->messages` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `reaction->user` FOREIGN KEY (`user_uniquePseudo`) REFERENCES `user` (`uniquePseudo`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `user-conversation`
--

DROP TABLE IF EXISTS `user-conversation`;
CREATE TABLE `user-conversation` (
  `uniquePseudo_user` varchar(80) NOT NULL,
  `id_conversation` int(11) unsigned NOT NULL,
  PRIMARY KEY (`uniquePseudo_user`,`id_conversation`),
  KEY `user-conversation->conversation_idx` (`id_conversation`),
  KEY `user->user-conversation_idx` (`uniquePseudo_user`),
  CONSTRAINT `user->user-conversation` FOREIGN KEY (`uniquePseudo_user`) REFERENCES `user` (`uniquePseudo`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user-conversation->conversation` FOREIGN KEY (`id_conversation`) REFERENCES `conversation` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping routines for database 'discution'
--
/*!50003 DROP FUNCTION IF EXISTS `isAmis` */;
DELIMITER ;;
CREATE DEFINER=`maxence`@`%` FUNCTION `isAmis`(uniqueMoi VARCHAR(80), uniqueTest VARCHAR(80)) RETURNS tinyint(1)
BEGIN
    DECLARE result BOOLEAN;
    SELECT EXISTS (
        SELECT 1
        FROM (
            SELECT DISTINCT u.*
            FROM user u
            JOIN amis a ON u.uniquePseudo = a.demandeur AND a.receveur = uniqueMoi
            UNION
            SELECT DISTINCT u.*
            FROM user u
            JOIN amis a ON u.uniquePseudo = a.receveur AND a.demandeur = uniqueMoi
        ) t
        WHERE t.uniquePseudo = uniqueTest
    ) INTO result;
    RETURN result;
END ;;
DELIMITER ;
/*!50003 DROP PROCEDURE IF EXISTS `CreateAmisDemande` */;
DELIMITER ;;
CREATE DEFINER=`maxence`@`%` PROCEDURE `CreateAmisDemande`(IN myUniquePseudo VARCHAR(80), IN amiUniquePseudo VARCHAR(80))
BEGIN
    SET @amisExist = (
        SELECT COUNT(*)
        FROM amis
        WHERE (demandeur = myUniquePseudo AND receveur = amiUniquePseudo)
           OR (demandeur = amiUniquePseudo AND receveur = myUniquePseudo)
    );
    
    IF @amisExist = 0 THEN
        SET @demandeExist = (
            SELECT COUNT(*)
            FROM demandeAmis
            WHERE demandeur = amiUniquePseudo AND receveur = myUniquePseudo
        );

        IF @demandeExist > 0 THEN
			SET SQL_SAFE_UPDATES = 0;
            
            DELETE FROM demandeAmis
            WHERE demandeur = amiUniquePseudo AND receveur = myUniquePseudo;
            
            SET SQL_SAFE_UPDATES = 1;
            
            INSERT INTO amis (demandeur, receveur)
            VALUES (myUniquePseudo, amiUniquePseudo);
            
            SELECT 'addFriend';
        ELSE
			SET @sendDemandeExist = (
				SELECT COUNT(*)
				FROM demandeAmis
				WHERE demandeur = myUniquePseudo AND receveur = amiUniquePseudo
			);
            IF @sendDemandeExist = 0 THEN
				INSERT INTO demandeAmis (demandeur, receveur)
				VALUES (myUniquePseudo, amiUniquePseudo);

				SELECT *
                FROM user
                WHERE uniquePseudo = amiUniquePseudo;
			END IF;
        END IF;
    END IF;

END ;;
DELIMITER ;
/*!50003 DROP PROCEDURE IF EXISTS `CreateConversation` */;
DELIMITER ;;
CREATE DEFINER=`maxence`@`%` PROCEDURE `CreateConversation`(
  IN admin_pseudo VARCHAR(80),
  IN conversation_name VARCHAR(255),
  IN conversation_extension VARCHAR(4)
)
BEGIN
  DECLARE new_conversation_id INT;

  -- Créer la conversation
  INSERT INTO conversation (name, uniquePseudo_admin,extension)
  VALUES (conversation_name, admin_pseudo,conversation_extension);

  -- Obtenir l'ID de la nouvelle conversation
  SET new_conversation_id = LAST_INSERT_ID();

  -- Ajouter une ligne dans user-conversation pour l'administrateur
  INSERT INTO `user-conversation` (uniquePseudo_user, id_conversation)
  VALUES (admin_pseudo, new_conversation_id);
  
  SELECT * FROM conversation WHERE id = new_conversation_id;
END ;;
DELIMITER ;
/*!50003 DROP PROCEDURE IF EXISTS `CreateMessage` */;
DELIMITER ;;
CREATE DEFINER=`maxence`@`%` PROCEDURE `CreateMessage`(
  IN uniquePseudo VARCHAR(80),
  IN id_conversation INT UNSIGNED,
  IN message TEXT,
  IN id_parent INT
)
BEGIN
  DECLARE new_messages_id INT;

  -- Créer le message
  INSERT INTO messages (id_conversation, Message, uniquePseudo_sender,id_parent)
  VALUES (id_conversation, message, uniquePseudo,id_parent);

  -- Obtenir l'ID du nouveau message
  SET new_messages_id = LAST_INSERT_ID();

  -- Ajouter une ligne dans message-read pour l'utilisateur
  INSERT INTO `message-read` (id_message, uniquePseudo_user)
  VALUES (new_messages_id, uniquePseudo);
  
  -- Récupérer la ligne du message créé
	SELECT m.*, u.*,GROUP_CONCAT(f.linkFile) linkfile,GROUP_CONCAT(f.name) name, CASE WHEN r.id_message IS NOT NULL THEN 1 ELSE 0 END AS is_read ,pu.uniquePseudo parent_uniquePseudo,pu.pseudo parent_pseudo,pu.extension parent_extension,pu.bio parent_bio,pm.Message parent_Message,pm.date parent_date,GROUP_CONCAT(pf.linkFile) parent_linkfile,GROUP_CONCAT(pf.name) parent_name
	FROM messages m 
	JOIN user u ON m.uniquePseudo_sender = u.uniquePseudo 
	LEFT JOIN file f ON f.id_message = m.id 
	LEFT JOIN `message-read` r ON m.id = r.id_message AND r.uniquePseudo_user = 'maxence' 

	Left join messages pm on m.id_parent=pm.id
	Left join user pu on pm.uniquePseudo_sender=pu.uniquePseudo
	LEFT JOIN file pf ON pf.id_message = pm.id 

	WHERE m.id = new_messages_id
	group by 1;
END ;;
DELIMITER ;
/*!50003 DROP PROCEDURE IF EXISTS `CreatePost` */;
DELIMITER ;;
CREATE DEFINER=`maxence`@`%` PROCEDURE `CreatePost`(
  IN uniquePseudo VARCHAR(80),
  IN message TEXT,
  IN id_parent INT UNSIGNED
)
BEGIN
  DECLARE new_messages_id INT;

  -- Créer le message
  INSERT INTO messages (Message, uniquePseudo_sender,id_parent)
  VALUES (message, uniquePseudo,id_parent);

  -- Obtenir l'ID du nouveau message
  SET new_messages_id = LAST_INSERT_ID();
  
  -- Récupérer la ligne du message créé
	SELECT subsub.*, COUNT(rep.id) AS nbr_reponse 
            FROM (
                SELECT sub.*, COUNT(r.user_uniquePseudo) AS nbr_reaction ,
                CASE 
                    WHEN r.user_uniquePseudo IS NOT NULL THEN true 
                    ELSE false 
                END AS a_deja_reagi
                FROM (
                    SELECT m.*, u.*,
                        GROUP_CONCAT(f.linkFile) AS linkfile,
                        GROUP_CONCAT(f.name) AS name
                    FROM messages m 
                    JOIN user u ON m.uniquePseudo_sender = u.uniquePseudo 
                    LEFT JOIN file f ON f.id_message = m.id 
                    WHERE m.id=new_messages_id
                    GROUP BY m.id 
                ) sub
                LEFT JOIN reactions r ON r.message_id = sub.id
                GROUP BY sub.id
            ) subsub
            LEFT JOIN messages rep ON subsub.id = rep.id_parent
            GROUP BY subsub.id;
END ;;
DELIMITER ;
/*!50003 DROP PROCEDURE IF EXISTS `GetAmis` */;
DELIMITER ;;
CREATE DEFINER=`maxence`@`%` PROCEDURE `GetAmis`(
	IN userId VARCHAR(80),
    IN search VARCHAR(80),
    IN limite int,
    IN offset_ int unsigned
    )
BEGIN
    SELECT * FROM (SELECT DISTINCT u.* FROM user u JOIN amis a ON u.uniquePseudo = a.demandeur AND a.receveur = userId UNION SELECT DISTINCT u.* FROM user u JOIN amis a ON u.uniquePseudo = a.receveur AND a.demandeur = userId ) AS subquery WHERE uniquePseudo like search LIMIT limite OFFSET offset_;
END ;;
DELIMITER ;
/*!50003 DROP PROCEDURE IF EXISTS `getMessage` */;
DELIMITER ;;
CREATE DEFINER=`maxence`@`%` PROCEDURE `getMessage`(
IN pUniquePseudo VARCHAR(80),
IN pConversationID INT UNSIGNED,
IN pMaxMessageID INT UNSIGNED,
IN pLIMITE INT
)
BEGIN
select
	m.* ,
	ru.reaction reaction,
    ru.email reaction_email,
    ru.uniquePseudo reaction_uniquePseudo,
    ru.pseudo reaction_pseudo,
    ru.passWord reaction_passWord,
    ru.extension reaction_extension,
    ru.bio reaction_bio
from(
SELECT 
	m.*, u.*,GROUP_CONCAT(f.linkFile) linkfile,GROUP_CONCAT(f.name) name, CASE WHEN r.id_message IS NOT NULL THEN 1 ELSE 0 END AS is_read ,
    pu.uniquePseudo parent_uniquePseudo,pu.pseudo parent_pseudo,pu.extension parent_extension,pu.bio parent_bio,pm.Message parent_Message,pm.date parent_date,GROUP_CONCAT(pf.linkFile) parent_linkfile,GROUP_CONCAT(pf.name) parent_name
FROM messages m 
JOIN user u ON m.uniquePseudo_sender = u.uniquePseudo 
LEFT JOIN file f ON f.id_message = m.id 
LEFT JOIN `message-read` r ON m.id = r.id_message AND r.uniquePseudo_user = pUniquePseudo
Left join messages pm on m.id_parent=pm.id
Left join user pu on pm.uniquePseudo_sender=pu.uniquePseudo
LEFT JOIN file pf ON pf.id_message = pm.id 

WHERE m.id_conversation = pConversationID AND m.id < pMaxMessageID
group by 1 
ORDER BY m.id 
DESC LIMIT pLIMITE) m
left join (SELECT
	m.*,
	r.emoji AS reaction,
	ru.*
FROM
    messages m
LEFT JOIN
    reactions r ON m.id = r.message_id
LEFT JOIN
    user ru ON r.user_uniquePseudo = ru.uniquePseudo) ru on ru.id=m.id;
END ;;
DELIMITER ;
/*!50003 DROP PROCEDURE IF EXISTS `getMessageLast` */;
DELIMITER ;;
CREATE DEFINER=`maxence`@`%` PROCEDURE `getMessageLast`(
IN pUniquePseudo VARCHAR(80),
IN pConversationID INT UNSIGNED,
IN pLIMITE INT
)
BEGIN

select
	m.* ,
	ru.reaction reaction,
    ru.email reaction_email,
    ru.uniquePseudo reaction_uniquePseudo,
    ru.pseudo reaction_pseudo,
    ru.passWord reaction_passWord,
    ru.extension reaction_extension,
    ru.bio reaction_bio
from(
SELECT 
	m.*, u.*,GROUP_CONCAT(f.linkFile) linkfile,GROUP_CONCAT(f.name) name, CASE WHEN r.id_message IS NOT NULL THEN 1 ELSE 0 END AS is_read ,
    pu.uniquePseudo parent_uniquePseudo,pu.pseudo parent_pseudo,pu.extension parent_extension,pu.bio parent_bio,pm.Message parent_Message,pm.date parent_date,GROUP_CONCAT(pf.linkFile) parent_linkfile,GROUP_CONCAT(pf.name) parent_name
FROM messages m 
JOIN user u ON m.uniquePseudo_sender = u.uniquePseudo 
LEFT JOIN file f ON f.id_message = m.id 
LEFT JOIN `message-read` r ON m.id = r.id_message AND r.uniquePseudo_user = pUniquePseudo

Left join messages pm on m.id_parent=pm.id
Left join user pu on pm.uniquePseudo_sender=pu.uniquePseudo
LEFT JOIN file pf ON pf.id_message = pm.id 

WHERE m.id_conversation = pConversationID
group by 1 
ORDER BY m.id 
DESC LIMIT pLIMITE) m
left join (SELECT
	m.*,
	r.emoji AS reaction,
	ru.*
FROM
    messages m
LEFT JOIN
    reactions r ON m.id = r.message_id
LEFT JOIN
    user ru ON r.user_uniquePseudo = ru.uniquePseudo) ru on ru.id=m.id;

END ;;
DELIMITER ;
/*!50003 DROP PROCEDURE IF EXISTS `getMessageOne` */;
DELIMITER ;;
CREATE DEFINER=`maxence`@`%` PROCEDURE `getMessageOne`(in id_message int unsigned, IN pseudounique VARCHAR(80))
BEGIN
SELECT subsubsub.*
FROM (
    SELECT subsub.*, COUNT(rep.id) AS nbr_reponse 
    FROM (
        Select sub.*,count(r.user_uniquePseudo) nbr_reaction ,
        CASE 
         WHEN r.user_uniquePseudo = pseudounique THEN true 
         ELSE false 
       END AS a_deja_reagi
		from (
			select m.*,u.* ,
				GROUP_CONCAT(f.linkFile) AS linkfile,
				GROUP_CONCAT(f.name) AS name
			from messages m 
			join user u on m.uniquePseudo_sender=u.uniquePseudo
			LEFT JOIN file f ON f.id_message = m.id 
			where m.id=id_message
			GROUP BY m.id 
			ORDER BY m.id DESC
		)sub
		left join reactions r on r.message_id=sub.id
		group by sub.id
	) subsub
	LEFT JOIN messages rep ON subsub.id = rep.id_parent
	GROUP BY subsub.id
) subsubsub
ORDER BY subsubsub.id DESC;

END ;;
DELIMITER ;
/*!50003 DROP PROCEDURE IF EXISTS `getPost` */;
DELIMITER ;;
CREATE DEFINER=`maxence`@`%` PROCEDURE `getPost`(IN pseudounique VARCHAR(80), IN pMaxMessageID INT UNSIGNED, IN limite INT)
BEGIN
    IF pMaxMessageID = 0 THEN
        SELECT subsubsub.*,
        CASE 
                    WHEN r.user_uniquePseudo = pseudounique THEN true 
                    ELSE false 
                END AS a_deja_reagi
        FROM (
            SELECT subsub.*, COUNT(rep.id) AS nbr_reponse 
            FROM (
                SELECT sub.*, COUNT(r.user_uniquePseudo) AS nbr_reaction
                FROM (
                    SELECT m.*, u.*,
                        GROUP_CONCAT(f.linkFile) AS linkfile,
                        GROUP_CONCAT(f.name) AS name
                    FROM messages m 
                    JOIN user u ON m.uniquePseudo_sender = u.uniquePseudo 
                    LEFT JOIN file f ON f.id_message = m.id 
                    WHERE m.id_conversation IS NULL AND m.uniquePseudo_sender IN (
                        SELECT DISTINCT u.uniquePseudo
                        FROM user u
                        JOIN amis a ON (u.uniquePseudo = a.demandeur AND a.receveur = pseudounique)
                                    OR (u.uniquePseudo = a.receveur AND a.demandeur = pseudounique)
                        UNION
                        SELECT uniquePseudo FROM user WHERE uniquePseudo = pseudounique
                    )
                    GROUP BY m.id 
                    ORDER BY m.id DESC
                    LIMIT limite
                ) sub
                LEFT JOIN reactions r ON r.message_id = sub.id
                GROUP BY sub.id
            ) subsub
            LEFT JOIN messages rep ON subsub.id = rep.id_parent
            GROUP BY subsub.id
        ) subsubsub
        LEFT JOIN reactions r ON r.message_id = subsubsub.id and r.user_uniquePseudo=pseudounique
        ORDER BY subsubsub.id DESC;
    ELSE
        -- Inclure la condition seulement si pMaxMessageID n'est pas égal à 0
        SELECT subsubsub.*,
        CASE 
                    WHEN r.user_uniquePseudo = pseudounique THEN true 
                    ELSE false 
                END AS a_deja_reagi
        FROM (
            SELECT subsub.*, COUNT(rep.id) AS nbr_reponse 
            FROM (
                SELECT sub.*, COUNT(r.user_uniquePseudo) AS nbr_reaction
                FROM (
                    SELECT m.*, u.*,
                        GROUP_CONCAT(f.linkFile) AS linkfile,
                        GROUP_CONCAT(f.name) AS name
                    FROM messages m 
                    JOIN user u ON m.uniquePseudo_sender = u.uniquePseudo 
                    LEFT JOIN file f ON f.id_message = m.id 
                    WHERE m.id_conversation IS NULL AND m.id < pMaxMessageID  AND m.uniquePseudo_sender IN (
                        SELECT DISTINCT u.uniquePseudo
                        FROM user u
                        JOIN amis a ON (u.uniquePseudo = a.demandeur AND a.receveur = pseudounique)
                                    OR (u.uniquePseudo = a.receveur AND a.demandeur = pseudounique)
                        UNION
                        SELECT uniquePseudo FROM user WHERE uniquePseudo = pseudounique
                    )
                    GROUP BY m.id 
                    ORDER BY m.id DESC
                    LIMIT limite
                ) sub
                LEFT JOIN reactions r ON r.message_id = sub.id
                GROUP BY sub.id
            ) subsub
            LEFT JOIN messages rep ON subsub.id = rep.id_parent
            GROUP BY subsub.id
        ) subsubsub
        LEFT JOIN reactions r ON r.message_id = subsubsub.id and r.user_uniquePseudo=pseudounique
        ORDER BY subsubsub.id DESC;
    END IF;
END ;;
DELIMITER ;
/*!50003 DROP PROCEDURE IF EXISTS `getPostChild` */;
DELIMITER ;;
CREATE DEFINER=`maxence`@`%` PROCEDURE `getPostChild`(IN idpost INT UNSIGNED,IN pseudounique VARCHAR(80),IN pMaxMessageID INT UNSIGNED, IN limite INT)
BEGIN
IF pMaxMessageID = 0 THEN
SELECT subsubsub.*,
        CASE 
         WHEN r.user_uniquePseudo IS NOT NULL THEN true 
         ELSE false 
       END AS a_deja_reagi
FROM (
    SELECT subsub.*, COUNT(rep.id) AS nbr_reponse 
    FROM (
        SELECT sub.*, COUNT(r.user_uniquePseudo) AS nbr_reaction 
        FROM (
            SELECT m.*, u.*,
                   GROUP_CONCAT(f.linkFile) AS linkfile,
                   GROUP_CONCAT(f.name) AS name
            FROM messages m 
            JOIN user u ON m.uniquePseudo_sender = u.uniquePseudo 
            LEFT JOIN file f ON f.id_message = m.id 
            WHERE m.id_conversation IS NULL and m.id_parent=idpost
            GROUP BY m.id 
            ORDER BY m.id DESC
            LIMIT limite
        ) sub
        LEFT JOIN reactions r ON r.message_id = sub.id
        GROUP BY sub.id
    ) subsub
    LEFT JOIN messages rep ON subsub.id = rep.id_parent
    GROUP BY subsub.id
) subsubsub
LEFT JOIN reactions r ON r.message_id = subsubsub.id and r.user_uniquePseudo=pseudounique
ORDER BY subsubsub.id DESC;
ELSE
SELECT subsubsub.*,
        CASE 
         WHEN r.user_uniquePseudo IS NOT NULL THEN true 
         ELSE false 
       END AS a_deja_reagi
FROM (
    SELECT subsub.*, COUNT(rep.id) AS nbr_reponse 
    FROM (
        SELECT sub.*, COUNT(r.user_uniquePseudo) AS nbr_reaction ,
        CASE 
         WHEN r.user_uniquePseudo IS NOT NULL THEN true 
         ELSE false 
       END AS a_deja_reagi
        FROM (
            SELECT m.*, u.*,
                   GROUP_CONCAT(f.linkFile) AS linkfile,
                   GROUP_CONCAT(f.name) AS name
            FROM messages m 
            JOIN user u ON m.uniquePseudo_sender = u.uniquePseudo 
            LEFT JOIN file f ON f.id_message = m.id 
            WHERE m.id_conversation IS NULL and m.id_parent=idpost AND m.id < pMaxMessageID
            GROUP BY m.id 
            ORDER BY m.id DESC
            LIMIT limite
        ) sub
        LEFT JOIN reactions r ON r.message_id = sub.id
        GROUP BY sub.id
    ) subsub
    LEFT JOIN messages rep ON subsub.id = rep.id_parent
    GROUP BY subsub.id
) subsubsub
LEFT JOIN reactions r ON r.message_id = subsubsub.id and r.user_uniquePseudo=pseudounique
ORDER BY subsubsub.id DESC;
END IF;
END ;;
DELIMITER ;
/*!50003 DROP PROCEDURE IF EXISTS `getPostUser` */;
DELIMITER ;;
CREATE DEFINER=`maxence`@`%` PROCEDURE `getPostUser`(IN pseudounique VARCHAR(80),IN mepseudounique VARCHAR(80), IN pMaxMessageID INT UNSIGNED, IN limite INT)
BEGIN
IF pMaxMessageID = 0 THEN
SELECT subsubsub.*,
        CASE 
         WHEN r.user_uniquePseudo IS NOT NULL THEN true 
         ELSE false 
       END AS a_deja_reagi
FROM (
    SELECT subsub.*, COUNT(rep.id) AS nbr_reponse 
    FROM (
        SELECT sub.*, COUNT(r.user_uniquePseudo) AS nbr_reaction
        FROM (
            SELECT m.*, u.*,
                   GROUP_CONCAT(f.linkFile) AS linkfile,
                   GROUP_CONCAT(f.name) AS name
            FROM messages m 
            JOIN user u ON m.uniquePseudo_sender = u.uniquePseudo 
            LEFT JOIN file f ON f.id_message = m.id 
            WHERE m.id_conversation IS NULL and m.uniquePseudo_sender=pseudounique
            GROUP BY m.id 
            ORDER BY m.id DESC
            LIMIT limite
        ) sub
        LEFT JOIN reactions r ON r.message_id = sub.id
        GROUP BY sub.id
    ) subsub
    LEFT JOIN messages rep ON subsub.id = rep.id_parent
    GROUP BY subsub.id
) subsubsub
LEFT JOIN reactions r ON r.message_id = subsubsub.id and r.user_uniquePseudo=mepseudounique
ORDER BY subsubsub.id DESC;
else
SELECT subsubsub.*,
        CASE 
         WHEN r.user_uniquePseudo IS NOT NULL THEN true 
         ELSE false 
       END AS a_deja_reagi
FROM (
    SELECT subsub.*, COUNT(rep.id) AS nbr_reponse 
    FROM (
        SELECT sub.*, COUNT(r.user_uniquePseudo) AS nbr_reaction 
        FROM (
            SELECT m.*, u.*,
                   GROUP_CONCAT(f.linkFile) AS linkfile,
                   GROUP_CONCAT(f.name) AS name
            FROM messages m 
            JOIN user u ON m.uniquePseudo_sender = u.uniquePseudo 
            LEFT JOIN file f ON f.id_message = m.id 
            WHERE m.id_conversation IS NULL AND m.id < pMaxMessageID  and m.uniquePseudo_sender=pseudounique
            GROUP BY m.id 
            ORDER BY m.id DESC
            LIMIT limite
        ) sub
        LEFT JOIN reactions r ON r.message_id = sub.id
        GROUP BY sub.id
    ) subsub
    LEFT JOIN messages rep ON subsub.id = rep.id_parent
    GROUP BY subsub.id
) subsubsub
LEFT JOIN reactions r ON r.message_id = subsubsub.id and r.user_uniquePseudo=mepseudounique
ORDER BY subsubsub.id DESC;
end if;
END ;;
DELIMITER ;
/*!50003 DROP PROCEDURE IF EXISTS `getReaction` */;
DELIMITER ;;
CREATE DEFINER=`maxence`@`%` PROCEDURE `getReaction`(in message_id int unsigned,in limit_ int,in offset_ int unsigned)
begin
select * from reactions r join user u on r.user_uniquePseudo=u.uniquePseudo where r.message_id=message_id;
end ;;
DELIMITER ;
/*!50003 DROP PROCEDURE IF EXISTS `MarkAllUnreadMessagesAsRead` */;
DELIMITER ;;
CREATE DEFINER=`maxence`@`%` PROCEDURE `MarkAllUnreadMessagesAsRead`(
  IN conversationId INT UNSIGNED,
  IN uniquePseudo_user VARCHAR(80)
)
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE messageId INT;

  -- Cursor pour sélectionner les messages non lus
  DECLARE cur CURSOR FOR
    SELECT m.id
    FROM messages m
    LEFT JOIN `message-read` mr ON m.id = mr.id_message AND mr.uniquePseudo_user = uniquePseudo_user
    WHERE m.id_conversation = conversationId
      AND mr.id_message IS NULL;

  -- Gérer les erreurs liées au curseur
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN cur;

  read_loop: LOOP
    FETCH cur INTO messageId;
    IF done THEN
      LEAVE read_loop;
    END IF;

    -- Insérer une nouvelle ligne dans message-read pour marquer le message comme lu
    INSERT INTO `message-read` (id_message, uniquePseudo_user)
    VALUES (messageId, uniquePseudo_user);
  END LOOP;

  CLOSE cur;
END ;;
DELIMITER ;
/*!50003 DROP PROCEDURE IF EXISTS `setReaction` */;
DELIMITER ;;
CREATE DEFINER=`maxence`@`%` PROCEDURE `setReaction`(
    IN p_message_id INT UNSIGNED,
    IN p_user_uniquePseudo VARCHAR(80),
    IN p_emoji CHAR(10)
)
BEGIN
    DECLARE v_existing_row_count INT;

    -- Vérifiez s'il existe déjà une ligne avec les clés primaires fournies
    SELECT COUNT(*) INTO v_existing_row_count
    FROM reactions
    WHERE message_id = p_message_id AND user_uniquePseudo = p_user_uniquePseudo;

    IF v_existing_row_count > 0 THEN
        -- Si une ligne existe, mettez à jour l'emoji
        UPDATE reactions
        SET emoji = p_emoji
        WHERE message_id = p_message_id AND user_uniquePseudo = p_user_uniquePseudo;
    ELSE
        -- Si aucune ligne n'existe, insérez une nouvelle ligne
        INSERT INTO reactions (message_id, user_uniquePseudo, emoji)
        VALUES (p_message_id, p_user_uniquePseudo, p_emoji);
    END IF;

    -- Retournez la jointure avec la table "user"
    SELECT reactions.message_id,reactions.emoji, user.* -- Sélectionnez les colonnes nécessaires
    FROM reactions
    INNER JOIN user ON reactions.user_uniquePseudo = user.uniquePseudo
    WHERE reactions.message_id = p_message_id AND reactions.user_uniquePseudo = p_user_uniquePseudo;
END ;;
DELIMITER ;

-- Dump completed on 2023-09-17 13:09:45
