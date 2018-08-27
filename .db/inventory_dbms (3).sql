-- phpMyAdmin SQL Dump
-- version 4.6.6deb5
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Aug 27, 2018 at 02:28 PM
-- Server version: 5.7.23-0ubuntu0.18.04.1
-- PHP Version: 7.2.7-0ubuntu0.18.04.2

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `inventory_dbms`
--

-- --------------------------------------------------------

--
-- Table structure for table `tblclients`
--

CREATE TABLE `tblclients` (
  `client_id` int(11) NOT NULL,
  `client_firstname` varchar(64) NOT NULL,
  `client_lastname` varchar(64) NOT NULL,
  `client_mobile` varchar(64) NOT NULL,
  `client_email` varchar(80) DEFAULT NULL,
  `client_address` varchar(100) NOT NULL,
  `client_date_added` datetime NOT NULL,
  `client_status` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tblorders`
--

CREATE TABLE `tblorders` (
  `order_id` int(11) NOT NULL,
  `order_amount` decimal(11,2) NOT NULL DEFAULT '0.00',
  `order_client_id` int(11) NOT NULL DEFAULT '0',
  `order_user_id` int(11) NOT NULL,
  `order_delivery_charge` int(11) NOT NULL DEFAULT '0',
  `order_date` datetime NOT NULL,
  `order_update_date` datetime DEFAULT NULL,
  `order_status` int(11) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tblorder_items`
--

CREATE TABLE `tblorder_items` (
  `item_id` int(11) NOT NULL,
  `item_order_id` int(11) NOT NULL,
  `item_product_id` int(11) NOT NULL,
  `item_qty` int(11) NOT NULL,
  `item_subtotal` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tblproductlines`
--

CREATE TABLE `tblproductlines` (
  `line_id` int(11) NOT NULL,
  `line_name` varchar(128) NOT NULL,
  `line_cover_image` varchar(150) NOT NULL DEFAULT 'no_content.png',
  `line_status` tinyint(1) NOT NULL DEFAULT '1',
  `line_supplier_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tblproducts`
--

CREATE TABLE `tblproducts` (
  `product_id` int(11) NOT NULL,
  `product_name` varchar(128) NOT NULL,
  `product_line_id` int(11) NOT NULL,
  `product_description` varchar(500) NOT NULL,
  `product_price` int(11) NOT NULL,
  `product_qty` int(11) NOT NULL,
  `product_cover_image` varchar(150) NOT NULL DEFAULT 'no_content.png',
  `product_status` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tblsettings`
--

CREATE TABLE `tblsettings` (
  `comp_id` int(11) NOT NULL,
  `comp_name` varchar(128) NOT NULL,
  `comp_address` varchar(200) NOT NULL,
  `comp_number` varchar(20) NOT NULL,
  `comp_email` varchar(128) NOT NULL,
  `comp_warehouse_size` int(11) NOT NULL,
  `comp_prod_ceil` int(11) NOT NULL DEFAULT '100',
  `comp_prod_floor` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `tblsettings`
--

INSERT INTO `tblsettings` (`comp_id`, `comp_name`, `comp_address`, `comp_number`, `comp_email`, `comp_warehouse_size`, `comp_prod_ceil`, `comp_prod_floor`) VALUES
(1, 'Lazer Blaster PC trading', 'Lower Bicutan, Taguig city', '09484334669', 'LazerBlazter@gmail.com', 2000, 50, 5);

-- --------------------------------------------------------

--
-- Table structure for table `tblsupplier`
--

CREATE TABLE `tblsupplier` (
  `supplier_id` int(11) NOT NULL,
  `supplier_name` varchar(150) NOT NULL,
  `supplier_email` varchar(150) NOT NULL,
  `supplier_number` varchar(50) NOT NULL,
  `supplier_contact` varchar(150) NOT NULL,
  `supplier_address` varchar(200) NOT NULL,
  `supplier_status` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tblsupply_order`
--

CREATE TABLE `tblsupply_order` (
  `so_id` int(11) NOT NULL,
  `so_supplier_id` int(11) NOT NULL,
  `so_date` datetime NOT NULL,
  `so_date_received` datetime DEFAULT NULL,
  `so_orderby_id` int(11) NOT NULL,
  `so_status` int(11) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tblsupply_order_items`
--

CREATE TABLE `tblsupply_order_items` (
  `oi_id` int(11) NOT NULL,
  `oi_so_id` int(11) NOT NULL,
  `oi_product_id` int(11) NOT NULL,
  `oi_qty` int(11) NOT NULL,
  `oi_status` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tblusers`
--

CREATE TABLE `tblusers` (
  `user_id` int(11) NOT NULL,
  `user_firstname` varchar(50) NOT NULL,
  `user_lastname` varchar(50) NOT NULL,
  `user_number` varchar(20) NOT NULL,
  `user_email` varchar(80) DEFAULT NULL,
  `user_loginname` varchar(128) NOT NULL,
  `user_password` varchar(128) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `tblusers`
--

INSERT INTO `tblusers` (`user_id`, `user_firstname`, `user_lastname`, `user_number`, `user_email`, `user_loginname`, `user_password`) VALUES
(1, 'Jerryco', 'Alaba', '09484334669', 'jerrycoalaba@gmail.com', 'jerryco', 'b9b3f4b10913fc4912c602328cebd1acfcbda7b02db0250a6ede9c78c41815aa');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `tblclients`
--
ALTER TABLE `tblclients`
  ADD PRIMARY KEY (`client_id`);

--
-- Indexes for table `tblorders`
--
ALTER TABLE `tblorders`
  ADD PRIMARY KEY (`order_id`);

--
-- Indexes for table `tblorder_items`
--
ALTER TABLE `tblorder_items`
  ADD PRIMARY KEY (`item_id`);

--
-- Indexes for table `tblproductlines`
--
ALTER TABLE `tblproductlines`
  ADD PRIMARY KEY (`line_id`);

--
-- Indexes for table `tblproducts`
--
ALTER TABLE `tblproducts`
  ADD PRIMARY KEY (`product_id`);

--
-- Indexes for table `tblsettings`
--
ALTER TABLE `tblsettings`
  ADD PRIMARY KEY (`comp_id`);

--
-- Indexes for table `tblsupplier`
--
ALTER TABLE `tblsupplier`
  ADD PRIMARY KEY (`supplier_id`);

--
-- Indexes for table `tblsupply_order`
--
ALTER TABLE `tblsupply_order`
  ADD PRIMARY KEY (`so_id`);

--
-- Indexes for table `tblsupply_order_items`
--
ALTER TABLE `tblsupply_order_items`
  ADD PRIMARY KEY (`oi_id`);

--
-- Indexes for table `tblusers`
--
ALTER TABLE `tblusers`
  ADD PRIMARY KEY (`user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `tblclients`
--
ALTER TABLE `tblclients`
  MODIFY `client_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;
--
-- AUTO_INCREMENT for table `tblorders`
--
ALTER TABLE `tblorders`
  MODIFY `order_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;
--
-- AUTO_INCREMENT for table `tblorder_items`
--
ALTER TABLE `tblorder_items`
  MODIFY `item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;
--
-- AUTO_INCREMENT for table `tblproductlines`
--
ALTER TABLE `tblproductlines`
  MODIFY `line_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;
--
-- AUTO_INCREMENT for table `tblproducts`
--
ALTER TABLE `tblproducts`
  MODIFY `product_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;
--
-- AUTO_INCREMENT for table `tblsettings`
--
ALTER TABLE `tblsettings`
  MODIFY `comp_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
--
-- AUTO_INCREMENT for table `tblsupplier`
--
ALTER TABLE `tblsupplier`
  MODIFY `supplier_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;
--
-- AUTO_INCREMENT for table `tblsupply_order`
--
ALTER TABLE `tblsupply_order`
  MODIFY `so_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;
--
-- AUTO_INCREMENT for table `tblsupply_order_items`
--
ALTER TABLE `tblsupply_order_items`
  MODIFY `oi_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;
--
-- AUTO_INCREMENT for table `tblusers`
--
ALTER TABLE `tblusers`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
