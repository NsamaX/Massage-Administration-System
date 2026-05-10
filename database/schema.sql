-- MaS (Massage Administration System) — Database Schema
-- MariaDB 10.x | Charset: utf8mb4_unicode_ci

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─────────────────────────────────────────────
-- DATABASE
-- ─────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS `mas`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `mas`;

-- ─────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `roles` (
  `id`   INT          NOT NULL AUTO_INCREMENT,
  `name` ENUM('dev','admin','staff') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `skills` (
  `id`   INT          NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_skill_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `employees` (
  `id`                INT           NOT NULL AUTO_INCREMENT,
  `first_name`        VARCHAR(100)  NOT NULL,
  `last_name`         VARCHAR(100)  NOT NULL,
  `phone`             VARCHAR(20)   NOT NULL DEFAULT '',
  `image_url`         VARCHAR(500)  NULL,
  `employment_status` ENUM('employed','terminated') NOT NULL DEFAULT 'employed',
  `created_at`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `employee_skills` (
  `employee_id` INT NOT NULL,
  `skill_id`    INT NOT NULL,
  PRIMARY KEY (`employee_id`, `skill_id`),
  CONSTRAINT `fk_es_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_es_skill`    FOREIGN KEY (`skill_id`)    REFERENCES `skills`    (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id`             INT          NOT NULL AUTO_INCREMENT,
  `employee_id`    INT          NULL,
  `role_id`        INT          NOT NULL,
  `pin`            VARCHAR(255) NOT NULL,
  `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_login_at`  DATETIME     NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_user_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_role`     FOREIGN KEY (`role_id`)     REFERENCES `roles`     (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `massages` (
  `id`           INT           NOT NULL AUTO_INCREMENT,
  `name`         VARCHAR(100)  NOT NULL,
  `description`  TEXT          NOT NULL DEFAULT '',
  `duration_min` INT           NOT NULL,
  `price`        DECIMAL(8,2)  NOT NULL,
  `hourly_rate`  DECIMAL(8,2)  NOT NULL DEFAULT 0,
  `image_url`    VARCHAR(500)  NULL,
  `status`       ENUM('active','paused','inactive') NOT NULL DEFAULT 'active',
  `created_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rooms` (
  `id`          INT NOT NULL AUTO_INCREMENT,
  `room_number` INT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_room_number` (`room_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `attendance` (
  `id`          INT  NOT NULL AUTO_INCREMENT,
  `employee_id` INT  NOT NULL,
  `date`        DATE NOT NULL,
  `status`      ENUM('present','absent') NOT NULL DEFAULT 'present',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attendance` (`employee_id`, `date`),
  CONSTRAINT `fk_att_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `appointments` (
  `id`                   INT          NOT NULL AUTO_INCREMENT,
  `employee_id`          INT          NULL,
  `massage_id`           INT          NOT NULL,
  `room_id`              INT          NULL,
  `start_time`           DATETIME     NOT NULL,
  `end_time`             DATETIME     NOT NULL,
  `status`               ENUM('waiting','in_progress','completed','cancelled') NOT NULL DEFAULT 'waiting',
  `hourly_rate_snapshot` DECIMAL(8,2) NULL,
  `created_at`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_apt_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_apt_massage`  FOREIGN KEY (`massage_id`)  REFERENCES `massages`  (`id`),
  CONSTRAINT `fk_apt_room`     FOREIGN KEY (`room_id`)     REFERENCES `rooms`     (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payroll` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `employee_id`  INT          NOT NULL,
  `period_start` DATE         NOT NULL,
  `period_end`   DATE         NOT NULL,
  `total_hours`  DECIMAL(6,2) NOT NULL DEFAULT 0,
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `paid_at`      DATETIME     NULL,
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_pay_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
