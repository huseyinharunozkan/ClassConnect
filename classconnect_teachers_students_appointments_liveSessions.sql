DROP DATABASE classconnect2;
CREATE DATABASE IF NOT EXISTS classconnect2;
USE classconnect2;

CREATE TABLE students (
   s_id INT NOT NULL AUTO_INCREMENT,
   full_name VARCHAR(100) NOT NULL,
   verification_code VARCHAR(6) DEFAULT NULL,
   email VARCHAR(100) NOT NULL,
   password VARCHAR(255) DEFAULT NULL,
   city VARCHAR(255) DEFAULT NULL,
   school VARCHAR(255) DEFAULT NULL,
   birth_date date DEFAULT NULL,
   profile_photo VARCHAR(255) DEFAULT NULL,
   phone_number VARCHAR(20) DEFAULT NULL,
   address VARCHAR(255) DEFAULT NULL,
   is_verified TINYINT(1) DEFAULT '0',
   google_id VARCHAR(100) DEFAULT NULL,
   local_provider ENUM ("microsoft","google","local"),
   code_created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
   PRIMARY KEY (s_id)
 ) ;

CREATE TABLE teachers (
   t_id INT NOT NULL AUTO_INCREMENT,
   full_name VARCHAR(255) DEFAULT NULL,
   email VARCHAR(100) NOT NULL,
   password VARCHAR(255) DEFAULT NULL,
   verification_code VARCHAR(6) DEFAULT NULL,
   is_verified TINYINT(1) DEFAULT '0',
   phone_number VARCHAR(20) DEFAULT NULL,
   university VARCHAR(255) DEFAULT NULL,
   faculty VARCHAR(255) DEFAULT NULL,
   department VARCHAR(255) DEFAULT NULL,
   location VARCHAR(255) DEFAULT NULL,
   profile_photo VARCHAR(255) DEFAULT NULL,
   google_id VARCHAR(100) DEFAULT NULL,
   local_provider ENUM ("microsoft","google","local"),
   code_generated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
   about_me TEXT,
   lesson_prices  JSON  DEFAULT NULL,
   availability JSON DEFAULT NULL,
   PRIMARY KEY (t_id)
 );

CREATE TABLE appointments (
   id INT NOT NULL AUTO_INCREMENT,
   teacher_id INT NOT NULL,
   student_id INT NOT NULL,
   lesson VARCHAR(100) NOT NULL,
   day_of_week VARCHAR(20) NOT NULL,
   appointment_date DATE NOT NULL,
   start_time TIME NOT NULL,
   end_time TIME NOT NULL,
   status ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
   created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
   PRIMARY KEY (id),
   KEY teacher_id (teacher_id),
   KEY student_id (student_id),
   CONSTRAINT appointments_ibfk_1 FOREIGN KEY (teacher_id) REFERENCES teachers (t_id),
   CONSTRAINT appointments_ibfk_2 FOREIGN KEY (student_id) REFERENCES students (s_id)
 ) ;



CREATE TABLE live_sessions (
   session_id INT NOT NULL AUTO_INCREMENT,
   teacher_id INT NOT NULL,
   student_id INT NOT NULL,
   lesson_slot_id INT NOT NULL,
   status ENUM('pending','ready','started','ended') NOT NULL DEFAULT 'pending',
   teacher_ready TINYINT(1) DEFAULT '0',
   student_ready TINYINT(1) DEFAULT '0',
   teacher_entered_home TINYINT(1) DEFAULT '0',
   student_entered_home TINYINT(1) DEFAULT '0',
   teacher_confirm_started TINYINT(1) DEFAULT '0',
   student_confirm_started TINYINT(1) DEFAULT '0',
   teacher_confirm_ended TINYINT(1) DEFAULT '0',
   student_confirm_ended TINYINT(1) DEFAULT '0',
   created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
   teacher_confirm_exit TINYINT(1) DEFAULT '0',
   student_confirm_exit TINYINT(1) DEFAULT '0',
   PRIMARY KEY (session_id),
   CONSTRAINT live_sessions_ibfk_1 FOREIGN KEY (teacher_id) REFERENCES teachers (t_id),
   CONSTRAINT live_sessions_ibfk_2 FOREIGN KEY (student_id) REFERENCES students (s_id)

 ) ;
 
 ALTER TABLE live_sessions
  ADD CONSTRAINT fk_ls_appointment
    FOREIGN KEY (lesson_slot_id)
    REFERENCES appointments(id)
    ON DELETE CASCADE;
