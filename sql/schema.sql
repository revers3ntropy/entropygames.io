SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------


DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
    `gh_id` bigint(128) NULL DEFAULT NULL,
    `gh_tok` varchar(256) NULL DEFAULT NULL,
    `username` varchar(320) COLLATE utf8mb4_unicode_ci NOT NULL,
    `name` varchar(320) COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
    `password` varchar(256) COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
    `salt` varchar(64) COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
    `email` varchar(320) COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
    `email_verified` tinyint(1) NOT NULL DEFAULT '0',
    `admin` int(4) NOT NULL DEFAULT '0',
    `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

DROP TABLE IF EXISTS `projects`;
CREATE TABLE `projects` (
    `id` varchar(128) NOT NULL,
    `name` varchar(64) NOT NULL,
    `globalAccess` int(11) NOT NULL DEFAULT '0',
    `hasBuild` tinyint(1) NOT NULL DEFAULT '0',
    `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
    `id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
    `userId` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
    `opened` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `expires` int(128) NOT NULL DEFAULT '86400',
    `active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

DROP TABLE IF EXISTS `backups`;
CREATE TABLE `backups` (
    `id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
    `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `name` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

DROP TABLE IF EXISTS `logs`;
CREATE TABLE `logs` (
    `id` varchar(128) NOT NULL,
    `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `madeBy` text COLLATE utf8mb4_unicode_ci NOT NULL,
    `msg` text COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

DROP TABLE IF EXISTS `comments`;
CREATE TABLE `comments` (
    `id` varchar(128) NOT NULL,
    `userId` varchar(128) NOT NULL,
    `projectId` varchar(128) NOT NULL,
    `content` varchar(1024) NOT NULL,
    `public` tinyint(1) NOT NULL DEFAULT '1',
    `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

DROP TABLE IF EXISTS `projectAccess`;
CREATE TABLE `projectAccess` (
    `userId` varchar(128) NOT NULL,
    `projectId` varchar(128) NOT NULL,
    `level` int(4) NOT NULL,
    `timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

DROP TABLE IF EXISTS `projectSaves`;
CREATE TABLE `projectSaves` (
    `userId` varchar(128) NOT NULL,
    `projectId` varchar(128) NOT NULL,
    `timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

DROP TABLE IF EXISTS `projectViews`;
CREATE TABLE `projectViews` (
    `userId` varchar(128) NOT NULL,
    `projectId` varchar(128) NOT NULL,
    `timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

-- Data Dump

-- Default admin user - password is 'password'
INSERT INTO `users`
(`id`, `username`, `password`, `salt`, `admin`) VALUES
    (
        'admin',
        'admin',
        '6733b7ffeace4887c3b31258079c780d8db3018db9cbc05c500df3521f968df8',
        'abc',
        1
    );


-- Add Primary Keys

ALTER TABLE `sessions`    ADD PRIMARY KEY (`id`);
ALTER TABLE `users`       ADD PRIMARY KEY (`id`);
ALTER TABLE `logs`        ADD PRIMARY KEY (`id`);
ALTER TABLE `backups`     ADD PRIMARY KEY (`id`);
ALTER TABLE `projects`    ADD PRIMARY KEY (`id`);

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;