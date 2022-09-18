SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------

CREATE TABLE `backups` (
    `id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
    `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `name` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

CREATE TABLE `logs` (
    `id` INT NOT NULL,
    `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `madeBy` text COLLATE utf8mb4_unicode_ci NOT NULL,
    `msg` text COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

CREATE TABLE `sessions` (
    `id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
    `userId` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
    `opened` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `expires` int(128) NOT NULL DEFAULT '86400',
    `active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

CREATE TABLE `users` (
    `id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
    `name` varchar(320) COLLATE utf8mb4_unicode_ci NOT NULL,
    `email` varchar(320) COLLATE utf8mb4_unicode_ci NOT NULL,
    `password` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL,
    `salt` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
    `admin` tinyint(1) NOT NULL DEFAULT 0,
    `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

CREATE TABLE `comments` (
    `id` bigint(128) NOT NULL,
    `userId` bigint(128) NOT NULL,
    `projectId` bigint(128) NOT NULL,
    `content` varchar(1024) NOT NULL,
    `public` tinyint(1) NOT NULL,
    `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

CREATE TABLE `projectAccess` (
    `userId` bigint(128) NOT NULL,
    `projectId` bigint(128) NOT NULL,
    `level` int(4) NOT NULL,
    `timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

CREATE TABLE `projects` (
    `id` bigint(128) NOT NULL,
    `name` varchar(60) NOT NULL,
    `globalAccess` int(11) NOT NULL DEFAULT '0',
    `hasBuild` tinyint(1) NOT NULL DEFAULT '0',
    `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

CREATE TABLE `projectSaves` (
    `userId` bigint(128) NOT NULL,
    `projectId` bigint(128) NOT NULL,
    `timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

CREATE TABLE `projectViews` (
    `userId` bigint(128) NOT NULL,
    `projectId` bigint(128) NOT NULL,
    `timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

-- Data Dump

-- Default admin user - password is 'password'
INSERT INTO `users`
    (`id`, `name`, `email`, `password`, `salt`, `admin`) VALUES
(
     'admin',
     'Admin',
     'admin@example.com',
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


-- AUTO_INCREMENT

ALTER TABLE `logs` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=0;


COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;