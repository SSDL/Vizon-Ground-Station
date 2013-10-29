/*
Copyright 2008 Space Systems Development Laboratory Licensed under the
Educational Community License, Version 2.0 (the "License"); you may
not use this file except in compliance with the License. You may
obtain a copy of the License at
	
http://www.osedu.org/licenses/ECL-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an "AS IS"
BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
or implied. See the License for the specific language governing
permissions and limitations under the License.
*/

//Globals
var numb="0123456789";
var myData = new Array();
var myLineSeries;
var chart;
var today;
var mid = 314;
var cmdToSendRaw;
var cmdToSendEnc;
var var_update_rate = 2000;

// When DOM is ready
$(function () {
        
	$('a.closeEl').bind('click', toggleContent);
	$('div.groupWrapper').Sortable(
	{
		accept: 'groupItem',
		helperclass: 'sortHelper',
		activeclass : 	'sortableactive',
		hoverclass : 	'sortablehover',
		handle: 'div.itemHeader',
		tolerance: 'pointer',
		onChange : function(ser)
		{
		},
		onStart : function()
		{
			$.iAutoscroller.start(this, document.getElementsByTagName('body'));
		},
		onStop : function()
		{
			$.iAutoscroller.stop();
		}
	});
	
	// Dialog box for prompting ground station
	$("#gs_selector_dialog").dialog({
		width: 600,
		autoOpen: false,
		modal: true,
		buttons: {
			'Send': function() {
				// Make the call to transmit
				var gsid = $("#gs_select")[0].value;
		
				
				// Make AJAX call to transmit command
			  jQuery.ajax({
				    type: "POST",
				    url:  "transmit.php",
				    data: "mid="+mid+"&cmd=" + cmdToSendRaw + "&enc="+cmdToSendEnc+ "&encode=snap_encode" + "&gsid=" + gsid,
					success: function(json) {alert("The following command was sent: " + enc)},
				  });

				
				$(this).dialog('close');
			},
			'Cancel': function() {
				$(this).dialog('close');
			}
		}
	});
	
	$("#options_dialog").dialog({
		width: 400,
		autoOpen: false,
		modal: true,
		buttons: {
			'Apply': function() {
				// save the setting
				var box = $("#text_box_update_rate")[0];
				var input = box.value;
				if (isNaN(input) || ("" == input)) {
					alert("Invalid number. Please retry.");
				} else {
					var_update_rate = Math.round(input)*1000;
					var_update_rate = Math.max(var_update_rate,1*1000);
					var_update_rate = Math.min(var_update_rate,60*1000);
					$(this).dialog('close');
				}
			},
			'Cancel': function() {
				$(this).dialog('close');
			}
		}
	});
	
	// Dialog Link
	$('#options_link').click(function(){
		$("#text_box_update_rate")[0].value = Math.round(var_update_rate/1000);
		$('#options_dialog').dialog('open');
		return false;
	})

	resetGndCmdSeqNum();
	dispTelem();
	startTime();
	
});

function zoom() {
	// Zoom the y properly
	ret = chart.getMinMaxYInXRange(0,Infinity);
	y_min = parseInt(ret.y_min)-10;
	y_max = parseInt(ret.y_max)+10;
	chart.setYExtremes(y_min, y_max);
	chart.redraw(true);
}

function compareTimes(d1, d2, thresh) {
	result = Math.abs(d1.UTC() - d2.UTC()) > thresh;
	return result;
}

//clock
function startTime()
{
	today = new Date();
	$('#clock').html(formatDateToUTCString(today));
	setTimeout("startTime()",500);
}

function translateBusCmdBox(command)
{
  var form = document.getElementById("busCmdForm");
  var param1 = "";
  var param2 = "";

  if(command == "Reset_RTC") cmd_num = "80";
  else if (command == "RTC_init") cmd_num = "84";
  else if (command == "Reset_Clyde") cmd_num = "90";
  else if (command == "HSS_init") cmd_num = "B1";
  else if (command == "Reset_Ant_Seq") cmd_num = "B2";
  else if (command == "Set_RTC")
  {
    cmd_num = "81";
    time = findOtherTime(form);
    param1 = time.substring(0,4);
    param2 = time.substring(4,8);
  }
  else if (command == "Set_Sync_Rate")
  {
    cmd_num = "82";
	param1 = form.busArg1.options[form.busArg1.selectedIndex].value;
  }
  else if (command == "Set_RTC_Calib")
  {
    cmd_num = "83";
	param1 = form.busArg1.options[form.busArg1.selectedIndex].value;
  }
  else if (command == "Set_Heater")
  {
    cmd_num = "91";
	param1 = form.busArg1.options[form.busArg1.selectedIndex].value;
  }
  else if (command == "Set_Antenna")
  {
    cmd_num = "B0";
	param1 = form.busArg1.options[form.busArg1.selectedIndex].value;
  }
  
  document.getElementById("busCmdRow2").innerHTML = "<td>Command number:</td><td>"+cmd_num+"</td>";
  if (param1 != "" ) document.getElementById("busCmdRow3").innerHTML = "<td>Parameter 1:</td><td>"+param1+"</td>";
  else document.getElementById("busCmdRow3").innerHTML = "<td></td>";
  document.getElementById("busCmdRow4").innerHTML = "<td>Parameter 2:</td><td>"+param2+"</td>";
	jQuery.ajax({
			type: "POST",
				url: "php/getCmdSeqNum.php",
				data: "mid="+mid,
				dataType: "json",
				success: function(json){

					exTime = findExecutionTime(form);
					cmd_length = padhexone((param1.length+param2.length)/2 + 12);
					var form2 = document.getElementById("gndCmdForm");
					seqNum = zero_pad_4bytes(d2h(parseInt(form2.CmdSeqNum.value) + 1));
					cmd_msg = cmd_num + cmd_length + seqNum + exTime + param1 + param2;
					cksms = calculate_checksums(cmd_msg);
					cmd_msg += cksms;
					rap = wrap_in_RAP(cmd_msg);
					
					document.getElementById("busCmdRow5").innerHTML = "<td>Execute at:</td><td>"+exTime+"</td>";
					document.getElementById("busCmdRow6").innerHTML = "<td>Checksum:</td><td>"+cksms+"</td>";
					document.getElementById("busCmdRow7").innerHTML = "<td>Sequence Number:</td><td>"+seqNum+"</td>";
					
					row8 = "<td colspan=3><input type=\"button\" onclick=encode_and_send(\""+rap+"\") value=\"Send\">";
					row8 += "<input type=\"button\" onclick=restoreBusCmdBox() value=\"Cancel\"></td>";
					
					// document.getElementById("busCmdRow7").innerHTML = "";
					document.getElementById("busCmdRow8").innerHTML = row8;
									
				}
			  });
 
}

function translateCmdCmdBox(command)
{
  var form = document.getElementById("cmdCmdForm");
  var param1 = "";
  var param2 = "";
  var param3 = "";

  if(command == "Get_command_queue")
    {
      cmd_num = "41"
      // param1 = form.cmdArg1.options[form.cmdArg1.selectedIndex].value;
    }
  else if (command == "Dequeue_command")
    {
      cmd_num = "42";
	  param1 = zero_pad_4bytes(d2h(Math.max(0,Math.min(4294967295,parseInt(form.telArg1.value)))));
	  if (form.telArg1.value == "") param1 = zero_pad_4bytes(d2h(0));
	  time = findOtherTime(form);
      param2 = time.substring(0,8);
    }
  else if (command == "Clear_command_list")
  {
    cmd_num = "43";
  }
  else if (command == "Clear_cmd_recv_exe_counters")
    cmd_num = "44";
  
  document.getElementById("cmdCmdRow2").innerHTML = "<td>Command number:</td><td>"+cmd_num+"</td>";
  document.getElementById("cmdCmdRow3").innerHTML = "<td>Parameter 1:</td><td>"+param1+"</td>" + "<td>Parameter 2:</td><td>"+param2+"</td>";
  document.getElementById("cmdCmdRow4").innerHTML = "<td>Parameter 3:</td><td>"+param3+"</td>";
	jQuery.ajax({
			type: "POST",
				url: "php/getCmdSeqNum.php",
				data: "mid="+mid,
				dataType: "json",
				success: function(json){

					exTime = findExecutionTime(form);
					cmd_length = padhexone((param1.length + param2.length)/2 + 12);
					var form2 = document.getElementById("gndCmdForm");
					seqNum = zero_pad_4bytes(d2h(parseInt(form2.CmdSeqNum.value) + 1));
					cmd_msg = cmd_num + cmd_length + seqNum + exTime + param1 + param2 + param3;
					cksms = calculate_checksums(cmd_msg);
					cmd_msg += cksms;
					rap = wrap_in_RAP(cmd_msg);
					
					document.getElementById("cmdCmdRow5").innerHTML = "<td>Execute at:</td><td>"+exTime+"</td>";
					document.getElementById("cmdCmdRow6").innerHTML = "<td>Checksum:</td><td>"+cksms+"</td>";
					document.getElementById("cmdCmdRow7").innerHTML = "<td>Sequence Number:</td><td>"+seqNum+"</td>";
					
					row8 = "<td colspan=2><input type=\"button\" onclick=encode_and_send(\""+rap+"\") value=\"Send\">";
					row8 += "<input type=\"button\" onclick=restoreCmdCmdBox() value=\"Cancel\"></td>";
					
					document.getElementById("cmdCmdRow8").innerHTML = row8;
									
				}
			  });
 
}

function translateDebugCmdBox(command)
{
  var form = document.getElementById("debugCmdForm");
  var param1 = "";
  var param2 = "";

  if(command == "Read_DIO_pin")
    {
      cmd_num = "60"
      // param1 = form.debugArg1.options[form.debugArg1.selectedIndex].value;
    }
  else if (command == "Read_ADC_port")
    {
      cmd_num = "61";
      // param1 = form.debugArg1.options[form.debugArg1.selectedIndex].value;
    }
  else if (command == "Set_DIO_pin")
    {
      cmd_num = "62";
      param1 = form.dioPort.options[form.dioPort.selectedIndex].value;
      param1 += form.dioPin.options[form.dioPin.selectedIndex].value;
      param2 = form.dioPoss.options[form.dioPoss.selectedIndex].value;
    }
  else if (command == "Reinitialize_ADC")
    {
      cmd_num = "64";
      // param1 = form.debugArg1.options[form.debugArg1.selectedIndex].value;
    }
  document.getElementById("debugCmdRow2").innerHTML = "<td>Command number:</td><td>"+cmd_num+"</td>";
  document.getElementById("debugCmdRow3").innerHTML = "<td>Parameter 1:</td><td>"+param1+"</td>";
  document.getElementById("debugCmdRow4").innerHTML = "<td>Parameter 2:</td><td>"+param2+"</td>";

jQuery.ajax({
			type: "POST",
				url: "php/getCmdSeqNum.php",
				data: "mid="+mid,
				dataType: "json",
				success: function(json){
					
					exTime = findExecutionTime(form);
					cmd_length = padhexone((param1.length + param2.length)/2 + 12);
					var form2 = document.getElementById("gndCmdForm");
					seqNum = zero_pad_4bytes(d2h(parseInt(form2.CmdSeqNum.value) + 1));
					cmd_msg = cmd_num + cmd_length + seqNum + exTime + param1 + param2;
					cksms = calculate_checksums(cmd_msg);
					cmd_msg += cksms;
					rap = wrap_in_RAP(cmd_msg);
										
					document.getElementById("debugCmdRow5").innerHTML = "<td>Execute at:</td><td>"+exTime+"</td>";
					document.getElementById("debugCmdRow6").innerHTML = "<td>Checksum:</td><td>"+cksms+"</td>";
					document.getElementById("debugCmdRow7").innerHTML = "<td>Sequence Number:</td><td>"+seqNum+"</td>";
					
					row8 = "<td colspan=2><input type=\"button\" onclick=encode_and_send(\""+rap+"\") value=\"Send\">";
					row8 += "<input type=\"button\" onclick=restoreDebugCmdBox() value=\"Cancel\"></td>";
					
					document.getElementById("debugCmdRow8").innerHTML = row8;
									
				}
			  });
}

function translatePayCmdBox(command)
{
  var form = document.getElementById("payCmdForm");
  var param1 = "";
  var param2 = "";

  if(command == "LMRST_power")
    {
      cmd_num = "c0"
      param1 = form.payArg1.options[form.payArg1.selectedIndex].value;
	  param2 = form.payArg2.options[form.payArg2.selectedIndex].value;
    }
  else if (command == "Burn_Wire")
  {
	  cmd_num = "c1";
      param1 = form.payArg1.options[form.payArg1.selectedIndex].value;
	  param2 = form.payArg2.options[form.payArg2.selectedIndex].value;
  }
	
  document.getElementById("payCmdRow2").innerHTML = "<td>Command number:</td><td>"+cmd_num+"</td>";
  document.getElementById("payCmdRow3").innerHTML = "<td>Parameter 1:</td><td>"+param1+"</td>";
  document.getElementById("payCmdRow4").innerHTML = "<td>Parameter 2:</td><td>"+param2+"</td>";

jQuery.ajax({
			type: "POST",
				url: "php/getCmdSeqNum.php",
				data: "mid="+mid,
				dataType: "json",
				success: function(json){

					exTime = findExecutionTime(form);
					cmd_length = padhexone((param1.length + param2.length)/2 + 12);
					var form2 = document.getElementById("gndCmdForm");
					seqNum = zero_pad_4bytes(d2h(parseInt(form2.CmdSeqNum.value) + 1));
					cmd_msg = cmd_num + cmd_length + seqNum + exTime + param1 + param2;
					cksms = calculate_checksums(cmd_msg);
					cmd_msg += cksms;
					rap = wrap_in_RAP(cmd_msg);
					document.getElementById("payCmdRow5").innerHTML = "<td>Execute at:</td><td>"+exTime+"</td>";
					document.getElementById("payCmdRow6").innerHTML = "<td>Checksum:</td><td>"+cksms+"</td>";
					document.getElementById("payCmdRow7").innerHTML = "<td>Sequence Number:</td><td>"+seqNum+"</td>";
					
					row8 = "<td colspan=2><input type=\"button\" onclick=encode_and_send(\""+rap+"\") value=\"Send\">";
					row8 += "<input type=\"button\" onclick=restorePayCmdBox() value=\"Cancel\"></td>";
					
					document.getElementById("payCmdRow8").innerHTML = row8;
									
				}
			  });
}

function translateSysCmdBox(command)
{
  var form = document.getElementById("sysCmdForm");
  var param1 = "";
  var param2 = "";

  if(command == "No-op")
  {
      cmd_num = "01";
  }
  else if(command == "Change_blink_rate")
    {
      cmd_num = "02";
      param1 = form.sysArg1.options[form.sysArg1.selectedIndex].value;
    }
  else if(command == "Set_SNAP_clock")
    {
      time = findOtherTime(form);
      param1 = time.substring(0,4);
      param2 = time.substring(4,8);
      cmd_num = "03";
    }
  else if(command == "Set_cmd_timeout")
  {
      /*time = findOtherTime(form);
      param1 = time.substring(0,4);
      param2 = time.substring(4,8);*/
	  param1 = 24*3600*parseInt(form.argDay.options[form.argDay.selectedIndex].value)+3600*parseInt(form.argHour.options[form.argHour.selectedIndex].value)+ 60*parseInt(form.argMinute.options[form.argMinute.selectedIndex].value)+parseInt(form.argSecond.options[form.argSecond.selectedIndex].value);

	  param1 = zero_pad_4bytes(d2h(param1));

      cmd_num = "04";
  }
  else if(command == "End_start_delay")
    {
      cmd_num = "05";
    }

  document.getElementById("sysCmdRow2").innerHTML = "<td>Command number:</td><td>"+cmd_num+"</td>";
  document.getElementById("sysCmdRow3").innerHTML = "<td>Parameter 1:</td><td>"+param1+"</td>";
  document.getElementById("sysCmdRow4").innerHTML = "<td>Parameter 2:</td><td>"+param2+"</td>";
  
  jQuery.ajax({
			type: "POST",
				url: "php/getCmdSeqNum.php",
				data: "mid="+mid,
				dataType: "json",
				success: function(json){

					exTime = findExecutionTime(form);
					cmd_length = padhexone((param1.length + param2.length)/2 + 12);
					var form2 = document.getElementById("gndCmdForm");
					seqNum = zero_pad_4bytes(d2h(parseInt(form2.CmdSeqNum.value) + 1));
					cmd_msg = cmd_num + cmd_length + seqNum + exTime + param1 + param2;
					cksms = calculate_checksums(cmd_msg);
					cmd_msg += cksms;
					document.getElementById("sysCmdRow5").innerHTML = "<td>Execute at:</td><td>"+exTime+"</td>";
					
					rap = wrap_in_RAP(cmd_msg);
					
					document.getElementById("sysCmdRow6").innerHTML = "<td>Checksum:</td><td>"+cksms+"</td>";
					document.getElementById("sysCmdRow7").innerHTML = "<td>Sequence Number:</td><td>"+seqNum+"</td>";
					
					row8 = "<td colspan=2><input type=\"button\" onclick=encode_and_send(\""+rap+"\") value=\"Send\">";
					row8 += "<input type=\"button\" onclick=restoreSysCmdBox() value=\"Cancel\"></td>";
					
					document.getElementById("sysCmdRow8").innerHTML = row8;
									
				},
			  });

  
}

function translateTelCmdBox(command)
{
  var form = document.getElementById("telCmdForm");
  var param1 = "";
  var param2 = "";
  var param3 = "";
  var param4 = "";
  var param5 = "";
  var row4 = "";

  if(command == "Stop_current_transmit_task")
    {
      cmd_num = "21";
    }
  else if(command == "Download_TAP_file")
    {
      cmd_num = "22";
      param1 = form.telArg1.options[form.telArg1.selectedIndex].value;
	  param2 = form.telArg2.options[form.telArg2.selectedIndex].value;
	  param3 = zero_pad_4bytes(d2h(Math.max(0,Math.min(4294967295,parseInt(form.telArg4.value)))));
	  if (form.telArg4.value == "") param3 = zero_pad_4bytes(d2h(0));
	  param4 = padhex(Math.max(1,Math.min(65535,parseInt(form.telArg3.value))));
	  if (form.telArg3.value == "") param4 = padhex("1");
	  param5 = padhexone(parseInt(form.telArg5.options[form.telArg5.selectedIndex].value));
	  row4 = "<td>Parameter 3: " + param3 + "</td><td>Parameter 4: " + param4 + "</td><td>Parameter 5: " + param5 + "</td>";
    }
  else if(command == "Delete_TAP_file")
    {
      cmd_num = "23";
      param1 = form.telArg1.options[form.telArg1.selectedIndex].value;
	  param2 = form.telArg2.options[form.telArg2.selectedIndex].value;
	  param3 = zero_pad_4bytes(d2h(Math.max(0,Math.min(4294967295,parseInt(form.telArg4.value))))).substring(0,6);
  	  if (form.telArg4.value == "") param3 = zero_pad_4bytes(d2h(0));
	  param4 = padhex(Math.max(1,Math.min(65535,parseInt(form.telArg3.value))));
  	  if (form.telArg3.value == "") param4 = padhex("1");
	  row4 = "<td>Parameter 3: </td><td>" + param3 + "</td><td>Parameter 4: </td><td>" + param4 + "</td>";
    }
  else if(command == "Beacon_now")
  {
    cmd_num = "24";
  }
  else if(command == "Set_TAP_Number")
  {
    cmd_num = "25";
	param1 = form.telArg1.options[form.telArg1.selectedIndex].value;
	param2 = zero_pad_4bytes(d2h(Math.max(0,Math.min(4294967295,parseInt(form.telArg2.value)))));
	if (form.telArg2.value == "") param2 = zero_pad_4bytes(d2h(0));
  }
  else if(command == "Set_TAP_delay")
  {
    cmd_num = "26";
	param1 = form.telArg1.options[form.telArg1.selectedIndex].value;
    param2 = form.telArg2.options[form.telArg2.selectedIndex].value;
  }
  else if(command == "Set_TAP_mode")
  {
    cmd_num = "27";
	param1 = form.telArg1.options[form.telArg1.selectedIndex].value;
	param2 = form.telArg2.options[form.telArg2.selectedIndex].value;
  }
  else if(command == "Clear_files")
  {
    cmd_num = "28";
	param1 = form.telArg1.options[form.telArg1.selectedIndex].value;
  }
  else if(command == "Request_Config_TAP")
  {
    cmd_num = "29";
  }
  else if(command == "Set_Telem_Save_Mode")
  {
    cmd_num = "2A";
	param1 = form.telArg1.options[form.telArg1.selectedIndex].value;
  }


  document.getElementById("telCmdRow2").innerHTML = "<td>Command number:</td><td>"+cmd_num+"</td>";
  document.getElementById("telCmdRow3").innerHTML = "";
  if (param1 != "") document.getElementById("telCmdRow3").innerHTML = "<td>Parameter 1:</td><td>"+ param1+"</td>";
  if (param2 != "") document.getElementById("telCmdRow3").innerHTML += "<td>Parameter 2:</td><td>"+param2+"</td>";

  document.getElementById("telCmdRow4").innerHTML = row4;
  

  jQuery.ajax({
			type: "POST",
				url: "php/getCmdSeqNum.php",
				data: "mid="+mid,
				dataType: "json",
				success: function(json){
					
					var form = document.getElementById("telCmdForm");
					// seqNum =
					// zero_pad_4bytes(d2h(parseInt(form.CmdSeqNum.value) + 1));
					exTime = findExecutionTime(form);
					cmd_length = padhexone((param1.length + param2.length + param3.length + param4.length + param5.length)/2 + 12);
					var form2 = document.getElementById("gndCmdForm");
					seqNum = zero_pad_4bytes(d2h(parseInt(form2.CmdSeqNum.value) + 1));
					cmd_msg = cmd_num + cmd_length + seqNum + exTime + param1 + param2 + param3 + param4 + param5;
					cksms = calculate_checksums(cmd_msg);
					cmd_msg += cksms;
					document.getElementById("telCmdRow5").innerHTML = "<td>Execute at:</td><td>"+exTime+"</td>";
					
					rap = wrap_in_RAP(cmd_msg);
					
					document.getElementById("telCmdRow6").innerHTML = "<td>Checksum:</td><td>"+cksms+"</td>";
					document.getElementById("telCmdRow7").innerHTML = "<td>Sequence Number:</td><td>"+seqNum+"</td>";
					
					row8 = "<td colspan=3><input type=\"button\" onclick=encode_and_send(\""+rap+"\") value=\"Send\">";
					row8 += "<input type=\"button\" onclick=restoreTelCmdBox() value=\"Cancel\"></td>";
					
					document.getElementById("telCmdRow8").innerHTML = row8;
					document.getElementById("telCmdRow9").innerHTML = "";
					document.getElementById("telCmdRow10").innerHTML = "";
									
				}
			  });
}


function clrGndCmdQ()
{
  jQuery.ajax({
		type: "POST",
			url: "php/clrGndCmdQ.php",
			data: "mid="+mid
	});
}

function resetGndCmdSeqNum()
{
  jQuery.ajax({
			type: "POST",
				url: "php/getCmdSeqNum.php",
				data: "mid="+mid,
				dataType: "json",
				success: function(json){
					seqNum = zero_pad_4bytes(d2h(parseInt(0) + 1));
					if (0 != json.length) {
						if ((json[0] != "") && (json[0] !="NODATA")) seqNum = zero_pad_4bytes(d2h(parseInt(json[0].seqNum) + 1));
						seqNumString = "<input type=\"text\" size=\"12\" maxlength = \"10\" value = \""+h2d(seqNum)+"\" name=\"CmdSeqNum\" onkeyup = \"res(this,numb);\"\>";
						document.getElementById("gndCmdSeqNum").innerHTML = seqNumString;
					}
				}
			  });
}

function findExecutionTime(form)
{
  var snapTime;
  for(i=0; i<form.length; i++)
    if (form.elements[i].checked)
      exTime = form.elements[i].value;
  if(exTime =="now")
    snapTime = "00000000";
  else
    {
      snapTime = 0;
      ssec = form.snapSecond.options[form.snapSecond.selectedIndex].value;
      smin = form.snapMinute.options[form.snapMinute.selectedIndex].value;
      shour = form.snapHour.options[form.snapHour.selectedIndex].value;
      sday = form.snapDay.options[form.snapDay.selectedIndex].value;
      smonth = form.snapMonth.options[form.snapMonth.selectedIndex].value;
      syear = form.snapYear.options[form.snapYear.selectedIndex].value - 2000;
      
      // add days from full years
      snapTime = syear*365 + Math.floor((syear+3)/4);
   
      // add days from full months
      switch(parseInt(smonth)) {
      case 12:
	snapTime += 30; // add November
      case 11:
	snapTime += 31; // add October
      case 10:
	snapTime += 30; // add September
      case 9:
	snapTime += 31; // add August
      case 8:
	snapTime += 31; // add July
      case 7:
	snapTime += 30; // add June
      case 6:
	snapTime += 31; // add May
      case 5:
	snapTime += 30; // add April
      case 4:
	snapTime += 31; // add March
      case 3:
	if(syear%4 == 0) // how long was February?
	  snapTime += 29;
	else
	  snapTime += 28;
      case 2:
	snapTime += 31; // add January
	break;
      default:
	break;
      }
      
      // add full days into the month
      snapTime += sday - 1;
      
      // convert days to seconds
      snapTime *= (86400);
      
      // add seconds into the day
      snapTime += parseInt(ssec);
      snapTime += parseInt(60*smin);
      snapTime += parseInt(3600*shour);
      snapTime = d2h(snapTime);
      snapTime = zero_pad_4bytes(snapTime);
      // echo "Big-endian time is ";
      // echo $snapTime;
      // snapTime = swap_bytes(snapTime);
    }
  return snapTime;
}

function buildBusCmdBox()
{
    // read the selected command from sys cmd form
    var form = document.getElementById("busCmdForm");
    var cmd = 99;
    for(i=0; i<form.length; i++)
      if (form.elements[i].checked)
        cmd = form.elements[i].value;

    if(cmd == 99)
      return;

    var row2 = " ";
    var row3 = " ";
    var row4 = " ";
    switch(cmd) {
    case "Reset_RTC":
      row1 = "<td colspan=2><h1>Reset RTC</h1></td>"; break;
    case "Set_RTC":
      row1 = "<td colspan=2><h1>Set RTC Time</h1></td>"; break;
    case "Set_Sync_Rate":
      row1 = "<td colspan=2><h1>Set RTC Time Sync Update Rate</h1></td>"; break;
    case "Set_RTC_Calib":
      row1 = "<td colspan=2><h1>Change RTC Calibration</h1></td>"; break;
    case "RTC_init":
      row1 = "<td colspan=2><h1>RTC Init</h1></td>"; break;
	case "Reset_Clyde":
      row1 = "<td colspan=2><h1>Reset Clyde Board</h1></td>"; break;
	case "Set_Heater":
      row1 = "<td colspan=2><h1>Set Heater Mode</h1></td>"; break;
	case "Set_Antenna":
      row1 = "<td colspan=2><h1>Set Antenna Status</h1></td>"; break;
	case "HSS_init":
      row1 = "<td colspan=2><h1>HSS Antenna Init</h1></td>"; break;
	case "Reset_Ant_Seq":
      row1 = "<td colspan=2><h1>Reset Antenna Deployment Sequence</h1></td>"; break;
    default:
      row1 = cmd;
    }

    // <!-- Select command number -->
    if(cmd == "Set_RTC")
      { 
	  
	  // Select desired clock time
    // if(cmd == "Set_SNAP_clock" || cmd == "Set_RTC") {
// if(cmd == "Set_SNAP_clock" || cmd == "Set_cmd_timeout") {
      // if (cmd == "Set_RTC")
	// row1 = "<td align=\"left\" colspan=2><h1>Set RTC</td></h1>";
	row2 = "<td colspan=2>Select time:</td>";
	// Other month menu
	var row3 = "<td colspan=2><select name=\"otherMonth\">\
                    <option value=\"1\">January</option>\
                    <option value=\"2\">February</option>\
                    <option value=\"3\">March</option>\
                    <option value=\"4\">April</option>\
                    <option value=\"5\">May</option>\
                    <option value=\"6\">June</option>\
                    <option value=\"7\">July</option>\
                    <option value=\"8\">August</option>\
                    <option value=\"9\">September</option>\
                    <option value=\"10\">October</option>\
                    <option value=\"11\">November</option>\
                    <option value=\"12\">December</option></select>";

	// Other day menu
	row3 = row3 + "<select name=\"otherDay\">";
	for(day=1; day<=31; day++)
	    row3 = row3 + "<option value=\""+day+"\">"+day;
	row3 = row3 + "</select>";
	
	// Other year menu
	row3 = row3 + "<select name=\"otherYear\">";
	for(yr=2000; yr<=2020; yr++)
	    row3 = row3 + "<option value=\""+yr+"\">"+yr;
	row3 = row3 + "</select></td>";
	
	// Other hour menu
	var row4 =  "<td colspan=2><select name=\"otherHour\"><option value=\"00\">hour</option>";
	for(hr=0; hr<=23; hr++)
	    row4 = row4 + "<option value=\"" + hr + "\">"+hr;
	row4 = row4 + "</select>";
	
	// Other minute menu
	row4 = row4 + "<select name=\"otherMinute\"><option value=\"00\">minute</option>";
	for(min=0; min<=59; min++)
	    row4 = row4 + "<option value=\""+ min+"\">"+min;
	row4 = row4 + "</select>";
	
	// Other second menu
	row4 = row4 + "<select name=\"otherSecond\"><option value=\"00\">second</option>";
	for(s=0; s<=59; s++)
	    row4 = row4 + "<option value=\""+s+ "\">"+s;
	    row4 = row4 + "</select></td>";
    }
	
	if(cmd=="Set_Sync_Rate"){
		row2 = "<td colspan=2>Select time sync:</td>";
		row3 = "<td colspan=2><select name=\"busArg1\">";
	for(c=0; c<256; c++)
	    row3 = row3 + "<option value=\""+checkTime(c)+ "\">"+c+"</option>";
	    row3 = row3 + "</select></td>";
	}
	
	if(cmd=="Set_RTC_Calib"){
		row2 = "<td colspan=2>RTC Calibration:</td>";
		row3 = "<td colspan=2><select name=\"busArg1\">";
	for(c=0; c<256; c++)
	    row3 = row3 + "<option value=\""+checkTime(c)+ "\">"+c+"</option>";
	    row3 = row3 + "</select></td>";
	}
	
	if(cmd=="Set_Heater"){
		row2 = "<td colspan=2>Heater Mode:</td>";
		row3 = "<td colspan=2><select name=\"busArg1\">";
	for(c=0; c<256; c++)
	    row3 = row3 + "<option value=\""+checkTime(c)+ "\">"+c+"</option>";
	    row3 = row3 + "</select></td>";
	}

	if(cmd=="Set_Antenna"){
		row2 = "<td colspan=2>Antenna Status:</td>";
		row3 = "<td colspan=2><select name=\"busArg1\">";
	for(c=0; c<2; c++)
	    row3 = row3 + "<option value=\""+checkTime(c)+ "\">"+c+"</option>";
	    row3 = row3 + "</select></td>";
	}
	
    document.getElementById("busCmdRow1").innerHTML = row1;
    document.getElementById("busCmdRow2").innerHTML = row2;
    document.getElementById("busCmdRow3").innerHTML = row3;
    document.getElementById("busCmdRow4").innerHTML = row4;

    document.getElementById("busCmdRow5").innerHTML = executeTimeMenuRow5();
    document.getElementById("busCmdRow6").innerHTML = executeTimeMenuRow6();
    document.getElementById("busCmdRow7").innerHTML = executeTimeMenuRow7();
	
    document.getElementById("busCmdRow9").innerHTML = "";
    document.getElementById("busCmdRow10").innerHTML = "";
	document.getElementById("busCmdRow11").innerHTML = "";
	document.getElementById("busCmdRow12").innerHTML = "";

    row8 = "<td><input type=\"button\" onclick=translateBusCmdBox(\""+cmd+"\") value=\"Confirm\">\
            <input type=\"button\" onclick=restoreBusCmdBox() value=\"Cancel\"></td>";

    document.getElementById("busCmdRow8").innerHTML = row8;
}

function buildCmdCmdBox()
{
    // read the selected command from sys cmd form
    var form = document.getElementById("cmdCmdForm");
    var cmd = 99;
    for(i=0; i<form.length; i++)
      if (form.elements[i].checked)
        cmd = form.elements[i].value;

    if(cmd == 99)
      return;

    var row2 = " ";
    var row3 = " ";
    var row4 = " ";
    switch(cmd) {
    case "Get_command_queue":
      row1 = "<td colspan=2><h1>Get command queue</h1></td>"; break;
    case "Dequeue_command":
      row1 = "<td colspan=2><h1>Dequeue command</h1></td>"; break;
    case "Clear_command_list":
      row1 = "<td colspan=2><h1>Clear command list</h1></td>"; break;
    case "Clear_cmd_recv_exe_counters":
      row1 = "<td colspan=2><h1>Clear Command Recv and Exe Counters</h1></td>"; break;
    default:
      row1 = cmd;
    }

    // <!-- Select command number -->
    if(cmd == "Dequeue_command")
      { 
	row2 = "<td>Command number: ";
	row2 += "</td><td><select name=\"cmdArg1\">";
	for(c=0; c<256; c++) row2 += "<option value=\""+checkTime(c)+ "\">"+c+"</option>";
	row2 = row2 + "</select></td>";
	  // Select desired clock time
    // if(cmd == "Set_SNAP_clock" || cmd == "Set_RTC") {
// if(cmd == "Set_SNAP_clock" || cmd == "Set_cmd_timeout") {
      // if (cmd == "Set_RTC")
	// row1 = "<td align=\"left\" colspan=2><h1>Set RTC</td></h1>";
	row3 = "<td>Select time:</td>";
	// Other month menu
	row3 += "<td><select name=\"otherMonth\">\
                    <option value=\"1\">January</option>\
                    <option value=\"2\">February</option>\
                    <option value=\"3\">March</option>\
                    <option value=\"4\">April</option>\
                    <option value=\"5\">May</option>\
                    <option value=\"6\">June</option>\
                    <option value=\"7\">July</option>\
                    <option value=\"8\">August</option>\
                    <option value=\"9\">September</option>\
                    <option value=\"10\">October</option>\
                    <option value=\"11\">November</option>\
                    <option value=\"12\">December</option></select>";

	// Other day menu
	row3 = row3 + "<select name=\"otherDay\">";
	for(day=1; day<=31; day++)
	    row3 = row3 + "<option value=\""+day+"\">"+day;
	row3 = row3 + "</select>";
	
	// Other year menu
	row3 = row3 + "<select name=\"otherYear\">";
	for(yr=2000; yr<=2020; yr++)
	    row3 = row3 + "<option value=\""+yr+"\">"+yr;
	row3 = row3 + "</select></td>";
	
	// Other hour menu
	var row4 =  "<td colspan=2><select name=\"otherHour\"><option value=\"00\">hour</option>";
	for(hr=0; hr<=23; hr++)
	    row4 = row4 + "<option value=\"" + hr + "\">"+hr;
	row4 = row4 + "</select>";
	
	// Other minute menu
	row4 = row4 + "<select name=\"otherMinute\"><option value=\"00\">minute</option>";
	for(min=0; min<=59; min++)
	    row4 = row4 + "<option value=\""+ min+"\">"+min;
	row4 = row4 + "</select>";
	
	// Other second menu
	row4 = row4 + "<select name=\"otherSecond\"><option value=\"00\">second</option>";
	for(s=0; s<=59; s++)
	    row4 = row4 + "<option value=\""+s+ "\">"+s;
	    row4 = row4 + "</select></td>";
    }

    document.getElementById("cmdCmdRow1").innerHTML = row1;
    document.getElementById("cmdCmdRow2").innerHTML = row2;
    document.getElementById("cmdCmdRow3").innerHTML = row3;
    document.getElementById("cmdCmdRow4").innerHTML = row4;

    document.getElementById("cmdCmdRow5").innerHTML = executeTimeMenuRow5();
    document.getElementById("cmdCmdRow6").innerHTML = executeTimeMenuRow6();
    document.getElementById("cmdCmdRow7").innerHTML = executeTimeMenuRow7();

    row8 = "<td><input type=\"button\" onclick=translateCmdCmdBox(\""+cmd+"\") value=\"Confirm\">\
            <input type=\"button\" onclick=restoreCmdCmdBox() value=\"Cancel\"></td>";

    document.getElementById("cmdCmdRow8").innerHTML = row8;
}

function buildDebugCmdBox()
{
    // read the selected command from sys cmd form
    var form = document.getElementById("debugCmdForm");
    var cmd = 99;
    for(i=0; i<form.length; i++)
	if (form.elements[i].checked)
	cmd = form.elements[i].value;

    if(cmd == 99)
      return;

    var row2 = " ";
    var row3 = " ";
    var row4 = " ";
    switch (cmd) {
    case "Read_DIO_pin":
      row1 = "<td colspan=2><h1>Read DIO pins</h1></td>"; break;
    case "Read_ADC_port":
      row1 = "<td colspan=2><h1>Read ADC ports</h1></td>"; break;
    case "Set_DIO_pin":
      row1 = "<td colspan=2><h1>Set DIO pin</h1></td>"; break;
    case "Reinitialize_ADC":
      row1 = "<td colspan=2><h1>Reinitialize ADC</h1></td>"; break;
    default:
      row1 = cmd;
    }

    // read DIO pins, read ADC ports, reinitialize ADC
    if(cmd == "Read_DIO_pin" || cmd == "Read_ADC_port" ||
       cmd == "Reinitialize_ADC")
      {
	/*row2 = "<td>Processor</td>";
	row3 = "<td><select name=\"debugArg1\">";
        row3 += "<option value=\"01\"> FM430 </option>";
	row3 += "</select><td>";*/
      }
    //<!-- Set DIO port -->
    if(cmd == "Set_DIO_pin")
      { 
	row2 = "<td colspan=2>DIO port: ";
	row2 += "<select name=\"dioPort\">";
	for(c=1; c<=6; c++)
	  row2 += "<option value=\""+padhexone(c)+"\">P"+c+"</option>";
	row2 += "</select>";
	row2 += "  Pin: <select name=\"dioPin\">";
	for(c=0; c<=7; c++)
	  row2 +="<option value=\""+padhexone(c)+"\">"+c+"</option>";
	row2 += "</select></td>";
	row3 = "";
	row4 = "<td colspan=2>Possibilities: <select name=\"dioPoss\"> \
                 <option value=\"04\"> Output high </option> \
                 <option value=\"01\"> Output low </option> \
                 <option value=\"14\"> Input </option></select></td>"
      }

    document.getElementById("debugCmdRow1").innerHTML = row1;
    document.getElementById("debugCmdRow2").innerHTML = row2;
    document.getElementById("debugCmdRow3").innerHTML = row3;
    document.getElementById("debugCmdRow4").innerHTML = row4;

    document.getElementById("debugCmdRow5").innerHTML = executeTimeMenuRow5();
    document.getElementById("debugCmdRow6").innerHTML = executeTimeMenuRow6();
    document.getElementById("debugCmdRow7").innerHTML = executeTimeMenuRow7();

    var row8 = "<td><input type=\"button\" onclick=translateDebugCmdBox(\""+cmd+"\") value=\"Confirm\"></td>\
                <td><input type=\"button\" onclick=restoreDebugCmdBox() value=\"Cancel\"></td>";

    document.getElementById("debugCmdRow8").innerHTML = row8;
}

function buildPayCmdBox()
{
    // read the selected command from sys cmd form
    var form = document.getElementById("payCmdForm");
    var cmd = 99;
    for(i=0; i<form.length; i++)
	if (form.elements[i].checked)
	    cmd = form.elements[i].value;

    if(cmd == 99)
      return;
	
    var row2 = " ";
    var row3 = " ";
    var row4 = " ";
	
	switch(cmd) {
    case "LMRST_power":
      row1 = "<td coldspan=2><h1> LMRST Power </h1></td>"; break;
    case "Burn_Wire":
      row1 = "<td coldspan=2><h1> Burn Wire Power</h1></td>"; break;
    }
	row2 = " ";
    // <!-- List of power modes -->
    if((cmd == "LMRST_power") || (cmd == "Burn_Wire"))
      {
	row3 = "<td>Primary: </td><td><select name=\"payArg1\">";
	row3 += "<option value=\"08\"> Off </option><option value=\"03\"> No Change </option><option value=\"01\"> On </option></select></td>";
	row4 = "<td>Redundant: </td><td><select name=\"payArg2\">";
	row4 += "<option value=\"08\"> Off </option><option value=\"03\"> No Change </option><option value=\"01\"> On </option></select></td>";
      }

    document.getElementById("payCmdRow1").innerHTML = row1;
    document.getElementById("payCmdRow2").innerHTML = row2;
    document.getElementById("payCmdRow3").innerHTML = row3;
    document.getElementById("payCmdRow4").innerHTML = row4;

    document.getElementById("payCmdRow5").innerHTML = executeTimeMenuRow5();
    document.getElementById("payCmdRow6").innerHTML = executeTimeMenuRow6();
    document.getElementById("payCmdRow7").innerHTML = executeTimeMenuRow7();

    var row8 = "<td><input type=\"button\" onclick=translatePayCmdBox(\""+cmd+"\") value=\"Confirm\"></td> \
                <td><input type=\"button\" onclick=restorePayCmdBox() value=\"Cancel\"></td>";

    document.getElementById("payCmdRow8").innerHTML = row8;
}

function buildSysCmdBox()
{
    // read the selected command from sys cmd form
    var form = document.getElementById("sysCmdForm");
    var cmd = 99;
    for(i=0; i<form.length; i++)
	if (form.elements[i].checked)
	    cmd = form.elements[i].value;
    
    // display the options for building the cmd
    // document.getElementById("sysCmdRow1").innerHTML = cmd;

    var row1 = " ";// <td colspan=2 align=\"left\"><h1>"+cmd+"</td></h1>";
    var row2 = " ";
    var row3 = " ";
    var row4 = " ";

    switch(cmd) {
    case "No-op":
      row1 = "<td colspan=2 align=left><h1> No-op </h1></td>"; break;
    case "Change_blink_rate":
      row1 = "<td colspan=2 align=left><h1>Change blink rate</h1></td>"; break;
    case "Set_SNAP_clock":
      row1 = "<td colspan=2 align=left><h1>Set SNAP time</h1></td>"; break;
    case "Set_cmd_timeout":
      row1 = "<td colspan=2 align=left><h1>Set Command Timeout Period</h1></td>"; break;
    case "End_start_delay":
      row1 = "<td colspan=2 align=left><h1>End Start Delay</h1></td>"; break;
    }

    // Select blink rate parameters
    if(cmd == "Change_blink_rate") {
	row3 = "<td colspan=2>Blink frequencies:</td>";
	row4 = "<td colspan=2><select name=\"sysArg1\">";
	for(f=25; f<=150; f+=25)
	    row4 = row4 + "<option value=\""+padhexone(f)+"\">"+f+"</option>";
	row4 = row4 + "</select> ticks</td>";
    }
    // Select desired clock time
    // if(cmd == "Set_SNAP_clock" || cmd == "Set_RTC") {
		
	if(cmd ==  "Set_cmd_timeout"){
		row2 = "<td colspan=2>Select period:</td>";
		row3 = row3 + "<td><select name=\"argDay\"><option value=\"0\">day</option>";
		for(day=0; day<=31; day++)
	    row3 = row3 + "<option value=\""+day+"\">"+day;
		row3 = row3 + "</select>";
		
		// Hour menu
		row3 +=  "<select name=\"argHour\"><option value=\"00\">hour</option>";
		for(hr=0; hr<=23; hr++)
		    row3 = row3 + "<option value=\"" + hr + "\">"+hr;
		row3 = row3 + "</select></td>";
		
		// Minute menu
		row4 = "<td colspan=2><select name=\"argMinute\"><option value=\"00\">minute</option>";
		for(min=0; min<=59; min++)
		    row4 = row4 + "<option value=\""+ min+"\">"+min;
		row4 = row4 + "</select>";
		
		// Second menu
		row4 = row4 + "<select name=\"argSecond\"><option value=\"00\">second</option>";
		for(s=0; s<=59; s++)
		    row4 = row4 + "<option value=\""+s+ "\">"+s;
		    row4 = row4 + "</select></td>";
			
	}
	if(cmd == "Set_SNAP_clock") {
      //if (cmd == "Set_RTC")
	// row1 = "<td align=\"left\" colspan=2><h1>Set RTC</td></h1>";
	row2 = "<td colspan=2>Select time:</td>";
	// Other month menu
	var row3 = "<td colspan=2><select name=\"otherMonth\">\
                    <option value=\"1\">January</option>\
                    <option value=\"2\">February</option>\
                    <option value=\"3\">March</option>\
                    <option value=\"4\">April</option>\
                    <option value=\"5\">May</option>\
                    <option value=\"6\">June</option>\
                    <option value=\"7\">July</option>\
                    <option value=\"8\">August</option>\
                    <option value=\"9\">September</option>\
                    <option value=\"10\">October</option>\
                    <option value=\"11\">November</option>\
                    <option value=\"12\">December</option></select>";

	// Other day menu
	row3 = row3 + "<select name=\"otherDay\">";
	for(day=1; day<=31; day++)
	    row3 = row3 + "<option value=\""+day+"\">"+day;
	row3 = row3 + "</select>";
	
	// Other year menu
	row3 = row3 + "<select name=\"otherYear\">";
	for(yr=2000; yr<=2020; yr++)
	    row3 = row3 + "<option value=\""+yr+"\">"+yr;
	row3 = row3 + "</select></td>";
	
	// Other hour menu
	var row4 =  "<td colspan=2><select name=\"otherHour\"><option value=\"00\">hour</option>";
	for(hr=0; hr<=23; hr++)
	    row4 = row4 + "<option value=\"" + hr + "\">"+hr;
	row4 = row4 + "</select>";
	
	// Other minute menu
	row4 = row4 + "<select name=\"otherMinute\"><option value=\"00\">minute</option>";
	for(min=0; min<=59; min++)
	    row4 = row4 + "<option value=\""+ min+"\">"+min;
	row4 = row4 + "</select>";
	
	// Other second menu
	row4 = row4 + "<select name=\"otherSecond\"><option value=\"00\">second</option>";
	for(s=0; s<=59; s++)
	    row4 = row4 + "<option value=\""+s+ "\">"+s;
	    row4 = row4 + "</select></td>";
    }
    
    document.getElementById("sysCmdRow1").innerHTML = row1;
    document.getElementById("sysCmdRow2").innerHTML = row2;
    document.getElementById("sysCmdRow3").innerHTML = row3;
    document.getElementById("sysCmdRow4").innerHTML = row4;

    document.getElementById("sysCmdRow5").innerHTML = executeTimeMenuRow5();
    document.getElementById("sysCmdRow6").innerHTML = executeTimeMenuRow6();
    document.getElementById("sysCmdRow7").innerHTML = executeTimeMenuRow7();

    row8 = "<td><input type=\"button\" onclick=translateSysCmdBox(\""+cmd+"\") value=\"Confirm\"></td>\
            <td><input type=\"button\" onclick=restoreSysCmdBox() value=\"Cancel\"></td>";

    document.getElementById("sysCmdRow8").innerHTML = row8;
}

function buildTelCmdBox()
{
    // read the selected command from sys cmd form
    var form = document.getElementById("telCmdForm");
    var cmd = 99;
    for(i=0; i<form.length; i++)
	if (form.elements[i].checked)
	    cmd = form.elements[i].value;

    if(cmd == 99)
      return;
    
    row2 = row3 = row4 = row5 = row6 = row11 = row12 = " ";
    
    switch(cmd) {
    case "Stop_current_transmit_task":
      row1 = "<td colspan=2><h1>Stop current transmit</h1></td>"; break;
    case "Download_TAP_file":
      row1 = "<td colspan=2><h1>Download TAP file</h1></td>"; break;
    case "Delete_TAP_file":
      row1 = "<td colspan=2><h1>Delete TAP file</h1></td>"; break;
    case "Beacon_now":
      row1 = "<td colspan=2><h1>Beacon now</h1></td>"; break;
	case "Set_TAP_Number":
      row1 = "<td colspan=2><h1>Set TAP Sequence Number</h1></td>"; break;
	case "Set_TAP_delay":
      row1 = "<td colspan=2><h1>Set TAP delay</h1></td>"; break;
  	case "Set_TAP_mode":
      row1 = "<td colspan=2><h1>Set TAP collection mode</h1></td>"; break;
	case "Clear_files":
      row1 = "<td colspan=2><h1>Clear SD Card files</h1></td>"; break;
	case "Request_Config_TAP":
      row1 = "<td colspan=2><h1>Request Configuration TAP</h1></td>"; break;
	case "Set_Telem_Save_Mode":
      row1 = "<td colspan=2><h1>Set Telemetry Save Mode</h1></td>"; break;
    default:
      row1 = cmd;
    }

    //<!-- List of beacon frequencies -->
    if(cmd == "Stop_current_transmit_task")
      { 
	row2 = "<td colspan=2>Stop current transmit</td>";
      }
    
	if(cmd == "Set_TAP_Number")
      { 
	row2 = "<td colspan=2>Application: ";
	row2 += "<select name=\"telArg1\">";
	row2 += "<option value=\"01\">1 - Beacon</option>";
	row2 += "<option value=\"02\">2 - Command Echo</option>";
	row2 += "<option value=\"03\">3 - Bus Telemetry</option>";
	row2 += "<option value=\"04\">4 - LMRST Telemetry</option>";
	row2 += "<option value=\"05\">5 - Configuration Telemetry</option>";
	row2 += "<option value=\"06\">6 - I2C Read Telemetry</option>";
	row2 += "<option value=\"07\">7 - Clyde Voltage Telemetry</option>";
	row2 += "<option value=\"08\">8 - Clyde Current Telemetry</option>";
	row2 += "<option value=\"09\">9 - Clyde Temperature Telmetry</option>";
	row2 += "<option value=\"0A\">10 - Command Buffer Telemetry</option>";
	row2 += "<option value=\"0B\">11 - ADC Configuration Telemetry</option>";
	row2 += "<option value=\"0C\">12 - DIO Configuration Telemetry </option></select></td>";
	row3 = "<td colspan=2>Sequence Number (0 to 4,295,967,295): ";
	row3 += "<input type=\"text\" size = \"12\" maxlength = \"10\" name=\"telArg2\" onkeyup = \"res(this,numb);\"/></td>";
	}

    //<!-- List of data collection frequencies -->
    if(cmd == "Set_TAP_delay")
      { 
	row2 = "<td colspan=2>Application: ";
	row2 += "<select name=\"telArg1\">";
	row2 += "<option value=\"01\">1 - Beacon</option>";
	row2 += "<option value=\"02\">2 - Command Echo</option>";
	row2 += "<option value=\"03\">3 - Bus Telemetry</option>";
	row2 += "<option value=\"04\">4 - LMRST Telemetry</option>";
	row2 += "<option value=\"05\">5 - Configuration Telemetry</option>";
	row2 += "<option value=\"06\">6 - I2C Read Telemetry</option>";
	row2 += "<option value=\"07\">7 - Clyde Voltage Telemetry</option>";
	row2 += "<option value=\"08\">8 - Clyde Current Telemetry</option>";
	row2 += "<option value=\"09\">9 - Clyde Temperature Telmetry</option>";
	row2 += "<option value=\"0A\">10 - Command Buffer Telemetry</option>";
	row2 += "<option value=\"0B\">11 - ADC Configuration Telemetry</option>";
	row2 += "<option value=\"0C\">12 - DIO Configuration Telemetry </option></select></td>";
	row3 = "<td colspan=2>Frequency:</td>";
	row4 = "<td colspan=2><select name=\"telArg2\"><option value=\"00\">infinite</option>";
	for(seconds=1; seconds<=254; seconds++)
	    row4 = row4 + "<option value=\""+padhexone(d2h(seconds))+"\">"+seconds+"</option>";
	row4 += "</select> Seconds between samples</td>";
      }
	  
	if(cmd == "Set_TAP_mode")
    { 
	row2 = "<td colspan=2>Application: ";
	row2 += "<select name=\"telArg1\">";
	row2 += "<option value=\"01\">1 - Beacon</option>";
	row2 += "<option value=\"02\">2 - Command Echo</option>";
	row2 += "<option value=\"03\">3 - Bus Telemetry</option>";
	row2 += "<option value=\"04\">4 - LMRST Telemetry</option>";
	row2 += "<option value=\"05\">5 - Configuration Telemetry</option>";
	row2 += "<option value=\"06\">6 - I2C Read Telemetry</option>";
	row2 += "<option value=\"07\">7 - Clyde Voltage Telemetry</option>";
	row2 += "<option value=\"08\">8 - Clyde Current Telemetry</option>";
	row2 += "<option value=\"09\">9 - Clyde Temperature Telmetry</option>";
	row2 += "<option value=\"0A\">10 - Command Buffer Telemetry</option>";
	row2 += "<option value=\"0B\">11 - ADC Configuration Telemetry</option>";
	row2 += "<option value=\"0C\">12 - DIO Configuration Telemetry </option></select></td>";
	row3 = "<td colspan=2>Mode: ";
	row3 += "<select name=\"telArg2\"><option value=\"01\"> Only SD Card</option>";
	row3 += "<option value=\"02\"> Only UART</option>";
	row3 += "<option value=\"04\"> Both</option></select></td>";
	}
	
	if(cmd == "Clear_files" || cmd == "Set_Telem_Save_Mode")
    { 
	row2 = "<td colspan=2>Folder: ";
	row2 += "<select name=\"telArg1\">";
	row2 += "<option value=\"01\">Init Mode</option>";
	row2 += "<option value=\"02\">Ops Mode</option></td>";
	}
	  
    // Select TAP file
    if(cmd == "Download_TAP_file")
      {
	row2 = "<td>Application: ";
	row2 += "<select name=\"telArg1\">";
	row2 += "<option value=\"01\">1 - Beacon</option>";
	row2 += "<option value=\"02\">2 - Command Echo</option>";
	row2 += "<option value=\"03\">3 - Bus Telemetry</option>";
	row2 += "<option value=\"04\">4 - LMRST Telemetry</option>";
	row2 += "<option value=\"05\">5 - Configuration Telemetry</option>";
	row2 += "<option value=\"06\">6 - I2C Read Telemetry</option>";
	row2 += "<option value=\"07\">7 - Clyde Voltage Telemetry</option>";
	row2 += "<option value=\"08\">8 - Clyde Current Telemetry</option>";
	row2 += "<option value=\"09\">9 - Clyde Temperature Telmetry</option>";
	row2 += "<option value=\"0A\">10 - Command Buffer Telemetry</option>";
	row2 += "<option value=\"0B\">11 - ADC Configuration Telemetry</option>";
	row2 += "<option value=\"0C\">12 - DIO Configuration Telemetry </option></select></td>";
	row2 += "<td> Directory: ";
	row2 += "<select name=\"telArg2\">";
	row2 += "<option value=\"01\">Init</option>";
	row2 += "<option value=\"02\">Ops</option></select></td>";
	// row3 = "<td>Length: " + "<select name=\"telArg2\">";
	row4 = "<td colspan=2>Length (1 to 65535): ";
	row4 += "<input type=\"text\" size = \"7\" maxlength = \"5\" name=\"telArg3\" onkeyup = \"res(this,numb);\"/></td>";
	
	row5 = "<td colspan=2>Start Sequence Number (0 to 4,294,967,295): " + "<input type=\"text\" size = \"12\" maxlength = \"10\" name=\"telArg4\" onkeyup = \"res(this,numb);\"/></td>";

	row6 = "<td>Every: " + "<select name=\"telArg5\">" + "<option value=\"1\">TAP</option>" + "<option value=\"2\">Second TAP</option>" + "<option value=\"5\">Fifth TAP</option>" + "<option value=\"10\">Tenth TAP</option></select></td>";
	
      }
	  
	  // Select TAP file
    if(cmd == "Delete_TAP_file")
      {
	row2 = "<td>Application: ";
	row2 += "<select name=\"telArg1\">";
	row2 += "<option value=\"01\">1 - Beacon</option>";
	row2 += "<option value=\"02\">2 - Command Echo</option>";
	row2 += "<option value=\"03\">3 - Bus Telemetry</option>";
	row2 += "<option value=\"04\">4 - LMRST Telemetry</option>";
	row2 += "<option value=\"05\">5 - Configuration Telemetry</option>";
	row2 += "<option value=\"06\">6 - I2C Read Telemetry</option>";
	row2 += "<option value=\"07\">7 - Clyde Voltage Telemetry</option>";
	row2 += "<option value=\"08\">8 - Clyde Current Telemetry</option>";
	row2 += "<option value=\"09\">9 - Clyde Temperature Telmetry</option>";
	row2 += "<option value=\"0A\">10 - Command Buffer Telemetry</option>";
	row2 += "<option value=\"0B\">11 - ADC Configuration Telemetry</option>";
	row2 += "<option value=\"0C\">12 - DIO Configuration Telemetry </option></select></td>";
	row2 += "<td> Directory: ";
	row2 += "<select name=\"telArg2\">";
	row2 += "<option value=\"01\">Init</option>";
	row2 += "<option value=\"02\">Ops</option></select></td>";
	// row3 = "<td>Length: " + "<select name=\"telArg2\">";
	row4 = "<td colspan=2>Length (1 to 65535): ";
	row4 += "<input type=\"text\" size = \"7\" maxlength = \"5\" name=\"telArg3\" onkeyup = \"res(this,numb);\"/></td>";
	
	row5 = "<td colspan=2>Start Sequence Number (0 to 4,294,967,295, mult. of 256): " + "<input type=\"text\" size = \"12\" maxlength = \"10\" name=\"telArg4\" onkeyup = \"res(this,numb);\"/></td>";
	
      }
	  
    document.getElementById("telCmdRow1").innerHTML = row1;
    document.getElementById("telCmdRow2").innerHTML = row2;
    document.getElementById("telCmdRow3").innerHTML = row3;
    document.getElementById("telCmdRow4").innerHTML = row4;
	document.getElementById("telCmdRow5").innerHTML = row5;
    document.getElementById("telCmdRow6").innerHTML = row6;


    document.getElementById("telCmdRow7").innerHTML = executeTimeMenuRow5();
    document.getElementById("telCmdRow8").innerHTML = executeTimeMenuRow6();
    document.getElementById("telCmdRow9").innerHTML = executeTimeMenuRow7();
    
    row10 = "<td align=\"left\"><input type=\"button\" onclick=translateTelCmdBox(\""+cmd+"\") value=\"Confirm\"></td>\
            <td><input type=\"button\" onclick=restoreTelCmdBox() value=\"Cancel\"></td>";
    
	document.getElementById("telCmdRow10").innerHTML = row10;
	document.getElementById("telCmdRow11").innerHTML = row11;
    document.getElementById("telCmdRow12").innerHTML = row12;
}

function executeTimeMenuRow5()
{
    row5 = "<td colspan=2>Execute: \
    <input type=\"radio\" name=\"when\" value=\"now\" checked> Now </input>\
    <input type=\"radio\" name=\"when\" value=\"later\" > Later (Specify time)</input></td>";
    return row5;
}

function printMonthMenu(month,monthString) {
	result = "<option value=\""+month+"\"";
	if (today.getUTCMonth+1 == month) {
		result = result + " SELECTED";
	}
	result = result + ">" + monthString+"</option>";
	return result;
}

function executeTimeMenuRow6()
{
  // SNAP month menu
  row6 = "<td colspan=2><select name=\"snapMonth\" onChange=selectLater(this)>";
                row6 = row6 + printMonthMenu(1,"January");
                row6 = row6 + printMonthMenu(2,"February");
                row6 = row6 + printMonthMenu(3,"March");
                row6 = row6 + printMonthMenu(4,"April");
                row6 = row6 + printMonthMenu(5,"May");
                row6 = row6 + printMonthMenu(6,"June");
                row6 = row6 + printMonthMenu(7,"July");
                row6 = row6 + printMonthMenu(8,"August");
                row6 = row6 + printMonthMenu(9,"September");
                row6 = row6 + printMonthMenu(10,"October");
                row6 = row6 + printMonthMenu(11,"November");
                row6 = row6 + printMonthMenu(12,"December");
                row6 = row6 + "</select>";
  
  // SNAP day menu
  row6 = row6 + "<select name=\"snapDay\" onChange=selectLater(this)>";
  for(day=1; day<=31; day++) {
	  row6 = row6 + "<option value=\""+day+"\"";
	  if (day == today.getUTCDate()) {
		  row6 = row6 + " SELECTED";
	  }
	  row6 = row6 + ">"+day;
  }
  row6 = row6 + "</select>";
  
  // SNAP year menu
  row6 = row6 + "<select name=\"snapYear\" onChange=selectLater(this)>";
  for(yr=2000; yr<=2020; yr++) {
	    row6 = row6 + "<option value=\""+yr+"\"";
	  if (yr == today.getUTCFullYear()) {
		  row6 = row6 + " SELECTED";
	  }
	  row6 = row6 + ">"+yr;
  }
  row6 = row6 + "</select></td>";

  return row6;
}

function executeTimeMenuRow7()
{
  // SNAP hour menu
  row7 =  "<td colspan=2><select name=\"snapHour\" onChange=selectLater(this)><option value=\"00\">hour</option>";
  for(hr=0; hr<=23; hr++) {
	  row7 = row7 + "<option value=\"" + hr+"\"";
	  if (hr == today.getUTCHours()) {
		  row7 = row7 + " SELECTED"
	  }
	  row7 = row7 + ">"+checkTime(hr);
  }
  row7 = row7 + "</select>";
  
  // SNAP minute menu
  row7 = row7 + "<select name=\"snapMinute\" onChange=selectLater(this)><option value=\"00\">minute</option>";
  for(min=0; min<=59; min++) {
    row7 = row7 + "<option value=\""+ min+"\"";
	  if (min == today.getUTCMinutes()) {
		  row7 = row7 + " SELECTED"
	  }
	  row7 = row7 + ">" + checkTime(min);
  }
  row7 = row7 + "</select>";
  
  // SNAP second menu
  row7 = row7 + "<select name=\"snapSecond\" onChange=selectLater(this)><option value=\"00\">second</option>";
  for(s=0; s<=59; s++) {
	  row7 = row7 + "<option value=\""+s+ "\"";
	  if (s == today.getUTCSeconds()) {
		  row7 = row7 + " SELECTED"
	  }
	  row7 = row7 + ">"+checkTime(s);
  }
  row7 = row7 + "</select></td>";
  return row7;
}

function selectLater(menu)
{
  place = menu.form.length - 9;
  menu.form.elements[place].checked=true;
}

function restoreBusCmdBox()
{
  document.getElementById("busCmdRow1").innerHTML = "";
  document.getElementById("busCmdRow2").innerHTML = "<td colspan=2> <input type=\"radio\" name=\"commandName\" value=\"Reset_RTC\"> Reset RTC</input> </td>";
  document.getElementById("busCmdRow3").innerHTML = "<td colspan=2> <input type=\"radio\" name=\"commandName\" value=\"Set_RTC\"> Set RTC Time</input> </td>";
  document.getElementById("busCmdRow4").innerHTML = "<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"Set_Sync_Rate\"> Set RTC Time Sync Update Rate</input></td>";
  document.getElementById("busCmdRow5").innerHTML = "<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"Set_RTC_Calib\"> Change RTC Calibration</input></td>";
  document.getElementById("busCmdRow6").innerHTML = "<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"RTC_init\"> RTC Init</input></td>";
  document.getElementById("busCmdRow7").innerHTML = "<td colspan=2> <input type=\"radio\" name=\"commandName\" value=\"Reset_Clyde\"> Reset Clyde Board</input></td>";
  document.getElementById("busCmdRow8").innerHTML = "<td colspan=2> <input type=\"radio\" name=\"commandName\" value=\"Set_Heater\"> Set Heater Mode</input></td>";
  document.getElementById("busCmdRow9").innerHTML = "<td colspan=2> <input type=\"radio\" name=\"commandName\" value=\"Set_Antenna\"> Set Antenna Status</input></td>";
  document.getElementById("busCmdRow10").innerHTML = "<td colspan=2> <input type=\"radio\" name=\"commandName\" value=\"HSS_init\"> HSS Init</input></td>";
  document.getElementById("busCmdRow11").innerHTML = "<td colspan=2> <input type=\"radio\" name=\"commandName\" value=\"Reset_Ant_Seq\"> Reset Antenna Deployment Sequence</input></td>";
  document.getElementById("busCmdRow12").innerHTML = "<td colspan=2> <input type=\"button\" onclick=buildBusCmdBox() value=\"Input parameters\"></td>";
}

function restoreCmdCmdBox()
{
  document.getElementById("cmdCmdRow1").innerHTML = "";
  document.getElementById("cmdCmdRow2").innerHTML = "<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"Get_command_queue\"> Get Command Queue</input></td>";
  document.getElementById("cmdCmdRow3").innerHTML = "<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"Dequeue_command\"> Dequeue Command</input></td>";
  document.getElementById("cmdCmdRow4").innerHTML = "<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"Clear_command_list\"> Clear Command List</input></td>";
  document.getElementById("cmdCmdRow5").innerHTML = "<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"Clear_cmd_recv_exe_counters\"> Clear Command Recv and Exe Counters</input></td>";
  document.getElementById("cmdCmdRow6").innerHTML = " ";
  document.getElementById("cmdCmdRow7").innerHTML = " ";
  document.getElementById("cmdCmdRow8").innerHTML = "<td colspan=2><input type=\"button\" onclick=buildCmdCmdBox() value=\"Input parameters\"></td>";

}

function restoreDebugCmdBox()
{
    document.getElementById("debugCmdRow1").innerHTML = "";
    document.getElementById("debugCmdRow2").innerHTML = "<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"Read_DIO_pin\"> Read DIO pins</input> </td>";
    document.getElementById("debugCmdRow3").innerHTML = "<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"Read_ADC_port\"> Read ADC ports</input> </td>";
    document.getElementById("debugCmdRow4").innerHTML = "<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"Set_DIO_pin\"> Set DIO pin</input> </td>";
    document.getElementById("debugCmdRow5").innerHTML = "<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"Reinitialize_ADC\"> Reinitialize ADC</input> </td>";
    document.getElementById("debugCmdRow6").innerHTML = " ";
    document.getElementById("debugCmdRow7").innerHTML = " ";
    document.getElementById("debugCmdRow8").innerHTML = "<td colspan=2><input type=\"button\" onclick=buildDebugCmdBox() value=\"Input parameters\"></td>";
}

function restorePayCmdBox()
{
    document.getElementById("payCmdRow1").innerHTML = "";
    document.getElementById("payCmdRow2").innerHTML = "<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"LMRST_power\"> LMRST power</input> </td>";
    document.getElementById("payCmdRow3").innerHTML = "<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"Burn_Wire\"> Burn Wire </input> </td> ";
    document.getElementById("payCmdRow4").innerHTML = " ";
    document.getElementById("payCmdRow5").innerHTML = " ";
    document.getElementById("payCmdRow6").innerHTML = " ";
    document.getElementById("payCmdRow7").innerHTML = " ";
    document.getElementById("payCmdRow8").innerHTML = "<td colspan=2><input type=\"button\" onclick=buildPayCmdBox() value=\"Input parameters\"></td>";
}

function restoreSysCmdBox()
{
    document.getElementById("sysCmdRow1").innerHTML = "<td colspan=2></td>";
    document.getElementById("sysCmdRow2").innerHTML =
	"<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"No-op\" checked>No-op</input></td>";
    document.getElementById("sysCmdRow3").innerHTML = 
	"<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"Change_blink_rate\">Change blink rate</input></td>";
    document.getElementById("sysCmdRow4").innerHTML = 
	"<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"Set_SNAP_clock\">Set SNAP time</input></td>";
    document.getElementById("sysCmdRow5").innerHTML =
	"<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"Set_cmd_timeout\">Set Command Timeout Period</input></td>";
    document.getElementById("sysCmdRow6").innerHTML =
	"<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"End_start_delay\">End Start Delay</input></td>";
    document.getElementById("sysCmdRow7").innerHTML = 
	"<td colspan=2></td>";
    document.getElementById("sysCmdRow8").innerHTML = 
	"<td colspan=2><input type=\"button\" onclick=buildSysCmdBox() value=\"Input parameters\"></td>";
}

function restoreTelCmdBox()
{
  document.getElementById("telCmdRow1").innerHTML = "";
  document.getElementById("telCmdRow2").innerHTML = "<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"Stop_current_transmit_task\">Stop current transmit</td>";
  document.getElementById("telCmdRow3").innerHTML = "<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"Download_TAP_file\"> Download TAP file</input> </td>";
  document.getElementById("telCmdRow4").innerHTML = "<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"Delete_TAP_file\"> Delete TAP file</input> </td>";
  document.getElementById("telCmdRow5").innerHTML = "<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"Beacon_now\"> Beacon now</input> </td>";
  document.getElementById("telCmdRow6").innerHTML = "<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"Set_TAP_Number\"> Set TAP sequence number</input> </td>";
  document.getElementById("telCmdRow7").innerHTML = "<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"Set_TAP_delay\"> Set data collection frequency</input></td>";
  document.getElementById("telCmdRow8").innerHTML = "<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"Set_TAP_mode\"> Set data collection mode</input></td>";
  document.getElementById("telCmdRow9").innerHTML = "<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"Clear_files\"> Clear files</input></td>";
  document.getElementById("telCmdRow10").innerHTML = "<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"Request_Config_TAP\"> Request Configuration TAP</input></td>";
  document.getElementById("telCmdRow11").innerHTML = "<td colspan=2><input type=\"radio\" name=\"commandName\" value=\"Set_Telem_Save_Mode\"> Set Telemetry Save Mode</input></td>";
  document.getElementById("telCmdRow12").innerHTML = "<td colspan=2><input type=\"button\" onclick=buildTelCmdBox() value=\"Input parameters\"></td>";
}

function restoreGndCmdListBox()
{
	var row1 = "<td>Latest Cmd Seq#:</td><td id=\"LatestCmdSeqNum\"></td><td><input type=\"button\" onclick=buildGndCmdListBox() value=\"Set Seq#\"></td><td colspan=3></td>";
	$('#GndCmdRow1').html(row1);	
}
					

//Display text-based telemetry
function dispTelem()
{
    // Generate Array of Telemetry Points Needed to Display (using method 6, [mid,tapid,seq,index]
    var Telem;
    var tidArray = [[mid,3,1]];					// Bus MSP430 Temp (TAPid=7)
    for(t=1;t<=8;t++) tidArray[t]=[mid,4,t];			// LMRST telemetry
														// points (8) (TAPid=3)
    for(t=1;t<=10; t++) tidArray[t+8]=[mid,7,t];		// Clyde voltages
    for(t=1;t<=8; t++) tidArray[t+18]=[mid,9,t];		// Clyde temps
    for(t=1;t<=10; t++) tidArray[t+26]=[mid,8,t];		// Clyde currents
    for(t=1;t<=12; t++) tidArray[t+36]=[mid,1,t];		// Beacon Info
	for(t=1;t<=43; t++) tidArray[t+48]=[mid,5,t];		// Config Info (except
														// for the RTC
														// calibration at the
														// end)
	for(t=1;t<=16; t++) tidArray[t+91]=[mid,11,t];		// ADC Info
	for(t=1;t<=30; t++) tidArray[t+107]=[mid,12,t];		// DIO Info
	// UGLY!
	tidArray[138] = [mid,5,44]; // RTC calibration
	// TODO UGLY!!! HACK!!
    tidArray[139]=[mid,1,13];		// Beacon Info (last byte after adding extraf ield)
    
    // Combine array into a string with '*' between values and '~' between rows.
    for(Telem=0; Telem<tidArray.length; Telem++) tidArray[Telem] = tidArray[Telem].join('*');
    idArrayString = tidArray.join('~');
    idArrayStringEnc = encodeURIComponent(idArrayString);
		
    // Send string of array to getTelem, using method 6.
    var v;
    jQuery.ajax({
	    type: "POST",
		url: "php/getTelem.php",
		data: "method=6&idArray=" + idArrayStringEnc,
		dataType: "json",
		success: function(json){
		// Decode and display telemetry points.
		if (json[0] !="NODATA" && json[0] !="") {
			$('#TimeBusTemp').html(json[0][0].recvtime + " GMT");
			$('#TimeSNAPBusTemp').html(snapTimeToUTCString(json[0][0].time));
			$('#T'+json[0][0].tid).html(json[0][0].convValue+" C");
		}
		
		if (json[1] !="NODATA") {
			$('#TimeLmrst').html(json[1][0].recvtime + " GMT");
			$('#TimeSNAPLmrst').html(snapTimeToUTCString(json[1][0].time));
		}
		if (json[1] !="NODATA") $('#SeqNumLmrst').html(json[1][0].seqNum);
		for(v = 1; v<=8; v++) if (json[v] !="NODATA") $('#T'+json[v][0].tid).html(roundNumber(json[v][0].convValue,3)+" V"); // LMRST
																																// Telem
																																// (8
																																// of
																																// them)
		if (json[9] !="NODATA") {
			$('#TimePower').html(json[9][0].recvtime + " GMT");
			$('#TimeSNAPPower').html(snapTimeToUTCString(json[9][0].time));
		}
		
		if (json[9] !="NODATA") $('#SeqNumVoltage').html(json[9][0].seqNum);
		if (json[19] !="NODATA") $('#SeqNumTemp').html(json[19][0].seqNum);
		if (json[27] !="NODATA") $('#SeqNumCurrent').html(json[27][0].seqNum);
		for(v = 9; v<=18; v++) if (json[v] !="NODATA") $('#T'+json[v][0].tid).html(roundNumber(json[v][0].convValue,2)+" V");  // Clyde
																																// Volts
																																// (10
																																// of
																																// them)
		for(v = 19; v<=26; v++) if (json[v] !="NODATA") $('#T'+json[v][0].tid).html(roundNumber(json[v][0].convValue,2)+" C"); // Clyde
																																// temps
																																// (8
																																// of
																																// them)
		for(v = 27; v<=34; v++) if (json[v] !="NODATA") $('#T'+json[v][0].tid).html(roundNumber(json[v][0].convValue,2)+" mA"); // Clyde
																																// Currents
																																// (8
																																// of
																																// them)
		for(v = 35; v<=36; v++) if (json[v] !="NODATA") $('#T'+json[v][0].tid).html(json[v][0].convValue+" "); // Clyde
																												// Dischrg
																												// Bytes
																												// (2
																												// of
																												// them)
		
		// Beacon fields
		if(json[37] !="NODATA"){
			$('#TimeBeacon').html(json[37][0].recvtime + " GMT");
			$('#SNAPTime').html(snapTimeToUTCString(json[37][0].time));
		}
					
		if (json[37] !="NODATA") $('#SeqNumBeacon').html(json[37][0].seqNum);
		
		// if (json[37] != "")
		// $('#T'+json[37][0].tid).html(zeroPad(d2b(parseInt(json[37][0].convValue)),8));
		// // FM430 status bye
		if (json[38] !="NODATA") $('#T'+json[38][0].tid).html(roundNumber(((parseInt(json[38][0].convValue)-1615)*704/4096),2)+" C"); // FM430
																																		// temp
		if (json[39] !="NODATA") $('#T'+json[39][0].tid).html(zeroPad(d2b(parseInt(json[39][0].convValue)),8)+"b"); // HSS
																													// status
																													// byte
		if (json[40] !="NODATA") $('#T'+json[40][0].tid).html(json[40][0].convValue+" commands     "); // Command
																										// received
																										// counter
		if (json[41] !="NODATA") $('#T'+json[41][0].tid).html(json[41][0].convValue+" commands"); // Commands
																									// executed
																									// count
		if (json[42] !="NODATA") $('#T'+json[42][0].tid).html(json[42][0].convValue+" commands"); // Commands
																									// rejected
																									// count
		if (json[43] !="NODATA") $('#T'+json[43][0].tid).html(json[43][0].convValue+" commands"); // Commands
																								// queued
																								// count
		if (json[44] !="NODATA") $('#T'+json[44][0].tid).html(json[44][0].convValue+" files"); // Init
																								// file
																								// count
		if (json[45] !="NODATA") $('#T'+json[44][0].tid).html(json[44][0].convValue+" files"); // Ops file count
		// file
		// count
		if (json[38] !="NODATA"){// Batt 1 voltage
			var temp = roundNumber((parseInt(json[38][0].convValue)-1615)*704/4096,2);
			if (temp > -25 && temp < 70) $('#T'+json[38][0].tid).html("<font color=\"green\">" + temp +" C"); 
			else $('#T'+json[38][0].tid).html("<font color=\"red\">"+temp+" C");
		}
		if (json[46] !="NODATA"){// Batt 1 voltage
			var voltage = roundNumber(json[46][0].convValue,2);
			if (voltage > 6.9 && voltage < 8.5) $('#T'+json[46][0].tid).html("<font color=\"green\">" + voltage +" V"); 
			else $('#T'+json[46][0].tid).html("<font color=\"red\">"+voltage+" V");
		}
		if (json[48] !="NODATA"){// Batt 2 voltage
			var voltage = roundNumber(json[48][0].convValue,2);
			if (voltage > 6.9 && voltage < 8.5) $('#T'+json[48][0].tid).html("<font color=\"green\">" + voltage +" V"); 
			else $('#T'+json[48][0].tid).html("<font color=\"red\">" + voltage+" V");
		}
		if (json[47] !="NODATA"){// Batt 1 current
			var current = roundNumber(json[47][0].convValue,2);
			if (current > 1 && current < 2500) $('#T'+json[47][0].tid).html("<font color=\"green\">" + current +" mA"); 
			else $('#T'+json[47][0].tid).html("<font color=\"red\">"+current+" mA");
		}
		
		if(json[49] !="NODATA" && json[49] !="") $('#SeqNumConfig').html(json[49][0].seqNum);
		if(json[49] !="NODATA" && json[49] !="") {
			$('#TimeConfig').html(json[49][0].recvtime + " GMT");
			$('#TimeSNAPConfig').html(snapTimeToUTCString(json[49][0].time));
		}
		for(cfgnum=49; cfgnum<=91; cfgnum++) {
			if(json[cfgnum] !="NODATA"  && json[cfgnum] !="") {
				if((cfgnum-49)%3==0 || cfgnum==86 || cfgnum==87){
					$('#T'+json[cfgnum][0].tid).html((json[cfgnum][0].convValue>>>1)*2+(json[cfgnum][0].convValue&1));
				} else if ((90==cfgnum) || (91==cfgnum)) { 
					$('#T'+json[cfgnum][0].tid).html(zeroPad(d2h(parseInt(json[cfgnum][0].convValue,10)),8));
				} else {
					$('#T'+json[cfgnum][0].tid).html(json[cfgnum][0].convValue);
				} 
			}
		}

		if(json[92] !="NODATA" && json[92] !="") $('#SeqNumADC').html(json[92][0].seqNum);
		if(json[92] !="NODATA" && json[92] !="") {
			$('#TimeADC').html(json[92][0].recvtime + " GMT");
			$('#TimeSNAPADC').html(snapTimeToUTCString(json[92][0].time));
		}
		for(adcnum=92; adcnum<=107; adcnum++) {if(json[adcnum] !="NODATA" && json[adcnum] !="") $('#T'+json[adcnum][0].tid).html(json[adcnum][0].convValue);} 
		
		// Populate digital I/O fields
		if(json[108] !="NODATA" && json[108] !="") $('#SeqNumDIO').html(json[108][0].seqNum);
		if(json[108] !="NODATA" && json[108] !="") {
			$('#TimeDIO').html(json[108][0].recvtime + " GMT");
			$('#TimeSNAPDIO').html(snapTimeToUTCString(json[108][0].time));
		}
		
		for(dionum=108; dionum<=137; dionum++) {if(json[dionum] !="NODATA" && json[dionum] !="") $('#T'+json[dionum][0].tid).html("0x" + padhexone(d2h(parseInt(json[dionum][0].convValue))));} 
				
		// RTC calib
		$('#T'+json[138][0].tid).html(json[138][0].convValue);
		if (json[139] !="NODATA"){// Batt 2 current
			var current = roundNumber(json[139][0].convValue,2);
			if (current > 1 && current < 2500) $('#T'+json[139][0].tid).html("<font color=\"green\">" + current +" mA"); 
			else $('#T'+json[139][0].tid).html("<font color=\"red\">"+current+" mA");
		}
		
		// Save snaptime for getting command info.
		var snaptime =0;
		if(json[37] !="NODATA") {
			snaptime = json[37][0].time;
			if(zeroPad(d2b(parseInt(json[37][0].convValue)),5).substring(0,1) == 1) $('#B1Status').html("<font color=\"red\"> Discharging");
			else $('#B1Status').html("<font color=\"green\"> Charging");
			if(zeroPad(d2b(parseInt(json[37][0].convValue)),5).substring(1,2) == 1) $('#B2Status').html("<font color=\"red\"> Discharging");
			else $('#B2Status').html("<font color=\"green\"> Charging");
			if(zeroPad(d2b(parseInt(json[37][0].convValue)),5).substring(2,3) == 1) $('#TxBuffBusy').html("<font color=\"red\"> Busy");
			else $('#TxBuffBusy').html("<font color=\"green\"> Not Busy");
			if(zeroPad(d2b(parseInt(json[37][0].convValue)),5).substring(3,4) == 1) $('#SDMode').html("<font color=\"red\"> Init");
			else $('#SDMode').html("<font color=\"green\"> Ops");
			if(zeroPad(d2b(parseInt(json[37][0].convValue)),5).substring(4,5) == 1) $('#AntStatus').html("<font color=\"green\"> Deployed");
			else $('#AntStatus').html("<font color=\"red\"> Not Deployed");
		}
		

			// Generate Array of Commands to request
    		var CmdList;
    		var CmdListArray = [[0,mid,snaptime]];				// Requesting
																// all commands
																// (0) with
																// status 0
																// (normal) and
																// time >
																// snaptime
			CmdListArray[1] = [3,mid,snaptime];				// Requesting all
															// on-board commands
															// (3) with status 0
															// (normal) and time
															// > snaptime
			CmdListArray[2] = [1,mid,0];			// Requesting latest command
													// (1) with status 0
													// (normal) and time > 0
    		CmdListArray[3]=[2,mid,snaptime];			// Requesting last
														// executed/passed
														// command (2) with
														// status 0 and time <
														// current
			CmdListArray[4]=[1,mid,2];				// Requesting latest command
													// (1) with status 2
													// (echoed) and time > 0
			for(CmdList=0; CmdList<CmdListArray.length; CmdList++) CmdListArray[CmdList] = CmdListArray[CmdList].join('*');
  		  CmdArrayString = CmdListArray.join('~');
  		  CmdArrayStringEnc = encodeURIComponent(CmdArrayString);
			// alert(CmdArrayStringEnc);
			jQuery.ajax({
			type: "POST",
				url: "php/getCmds.php",
				data: "method=2&CmdArray=" + CmdArrayStringEnc,
				dataType: "json",
				success: function(json){
					var GroundCmdList = "<tr><td colspan=6>All values in hex except seqNum and Time</td></tr><tr><td>Seq #</td><td>Cmd</td><td>Arguments</td><td>Time</td><td>Chksm1</td><td>Chksm2</td></tr>";
					if(json[0] !="NODATA" && json[0] !=""){
						GroundCmdList += "<tr><td align='center'>" + json[0][0].seqNum + "</td><td align='center'>" + padhexone(json[0][0].cmdtype) + "</td><td align='left'>";
						for(u=0; u<json[0].length; u++){
							if((u!=0 && json[0][u].cid == json[0][u-1].cid) || (u==0)){
								GroundCmdList += json[0][u].arg + " ";
								if(u == json[0].length - 1)GroundCmdList += "</td><td align='right'>" + snapTimeToUTCString(json[0][u].exectime) + "</td><td align='center'>" + padhexone(d2h(parseInt(json[0][u].chksum1))) + "</td><td align='center'>" + padhexone(d2h(parseInt(json[0][u].chksum2))) + "</td></tr>";
							}else{
								GroundCmdList += "</td><td align='right'>" + snapTimeToUTCString(json[0][u-1].exectime) + "</td><td align='center'>" + padhexone(d2h(parseInt(json[0][u-1].chksum1))) + "</td><td align='center'>" + padhexone(d2h(parseInt(json[0][u-1].chksum2))) + "</td></tr>" + "<tr><td align='center'>" + json[0][u].seqNum + "</td><td align='center'>" + padhexone(json[0][u].cmdtype) + "</td><td align='left'>" + json[0][u].arg + " ";
							}
						};
					}
					
					var FlightCmdList = "<tr><td colspan = 6>All values in hex except seqNum and Time</td></tr><tr><td>Seq</td><td>Cmd</td><td>Arguments</td><td>Time</td><td>Chksm1</td><td>Chksm2</td></tr>";
					if(json[1] !="NODATA" && json[1] !=""){
						FlightCmdList += "<tr><td align='center'>" + json[1][0].seqNum + "</td><td align='center'>" + padhexone(json[1][0].cmdtype) + "</td><td align='left'>";
						for(u=0; u<json[1].length; u++){
							if((u!=0 && json[1][u].cid == json[1][u-1].cid) || (u==0)){
								FlightCmdList += json[1][u].arg + " ";
								if(u == json[1].length - 1) FlightCmdList += "</td><td align='right'>" + json[1][u].exectime + "</td><td align='center'>" + padhexone(d2h(parseInt(json[1][u].chksum1))) + "</td><td align='center'>" + padhexone(d2h(parseInt(json[1][u].chksum2))) + "</td></tr>";
							}else{
								FlightCmdList += "</td><td align='right'>" + json[1][u-1].exectime + "</td><td align='center'>" + padhexone(d2h(parseInt(json[1][u-1].chksum1))) + "</td><td align='center'>" + padhexone(d2h(parseInt(json[1][u-1].chksum2))) + "</td></tr>" + "<tr><td align='center'>" + json[1][u].seqNum + "</td><td align='center'>" + padhexone(json[1][u].cmdtype) + "</td><td align='left'>" + json[1][u].arg + " ";
							}
						};
					}
					document.getElementById("GroundCommandTable").innerHTML = GroundCmdList;
					document.getElementById("FlightCommandTable").innerHTML = FlightCmdList;
					
					
					if(json[2] !="NODATA" && json[2] !="") {
						LastCmdSent = "<td>Last Cmd Sent:</td><td align='center'>" + json[2][0].seqNum + "</td><td align='center'>"+json[2][0].cmdtype+"</td><td align='left'>"
						for(argcount = 0; argcount < json[2].length; argcount++) LastCmdSent += json[2][argcount].arg + " ";
						LastCmdSent += "</td><td align='right'>"+json[2][0].exectime+"</td><td align='center'>"+padhexone(d2h(parseInt(json[2][0].chksum1)))+"</td><td align='center'>"+padhexone(d2h(parseInt(json[2][0].chksum2)))+"</td><td>"+"</td>";
						document.getElementById("LastCmdSent").innerHTML = LastCmdSent;
					}
					if(json[3] !="NODATA" && json[3] !="") {
						LastCmdExec = "<td>Last Cmd Executed:</td><td align='center'>" + json[3][0].seqNum + "</td><td align='center'>"+json[3][0].cmdtype+"</td><td align='left'>"
						for(argcount = 0; argcount < json[3].length; argcount++) LastCmdExec += json[3][argcount].arg + " ";
						LastCmdExec += "</td><td align='right'>"+json[3][0].exectime+"</td><td align='center'>"+padhexone(d2h(parseInt(json[3][0].chksum1)))+"</td><td align='center'>"+padhexone(d2h(parseInt(json[3][0].chksum2)))+"</td><td>"+"</td>";
						document.getElementById("LastCmdExec").innerHTML = LastCmdExec;
					}
					if(json[4] !="NODATA" && json[4] !="") {
						LastCmdEcho = "<td>Last Cmd Echoed:</td><td align='center'>" + json[4][0].seqNum + "</td><td align='center'>"+json[4][0].cmdtype+"</td><td align='left'>"
						for(argcount = 0; argcount < json[4].length; argcount++) LastCmdEcho += json[4][argcount].arg + " ";
						LastCmdEcho += "</td><td align='right'>"+json[4][0].exectime+"</td><td align='center'>"+padhexone(d2h(parseInt(json[4][0].chksum1)))+"</td><td align='center'>"+padhexone(d2h(parseInt(json[4][0].chksum2)))+"</td><td>"+"</td>";
						document.getElementById("LastCmdEcho").innerHTML = LastCmdEcho;
					}
				}
			});
			setTimeout("dispTelem()",var_update_rate);
		}
	});
}

function findOtherTime(form)
{
  var otherTime,osec,omin,ohour,oday,omonth,oyear;
  for(i=0; i<form.length; i++)
    if (form.elements[i].checked)
      exTime = form.elements[i].value;

  otherTime = 0;
  osec = form.otherSecond.options[form.otherSecond.selectedIndex].value;
  omin = form.otherMinute.options[form.otherMinute.selectedIndex].value;
  ohour = form.otherHour.options[form.otherHour.selectedIndex].value;
  oday = form.otherDay.options[form.otherDay.selectedIndex].value;
  omonth = form.otherMonth.options[form.otherMonth.selectedIndex].value;
  oyear = form.otherYear.options[form.otherYear.selectedIndex].value - 2000;
  
  // add days from full years
  otherTime = oyear*365 + Math.floor((oyear+3)/4);
  
  // add days from full months
  switch(parseInt(omonth)) {
  case 12:
    otherTime += 30; // add November
	alert(otherTime);
  case 11:
    otherTime += 31; // add October
  case 10:
    otherTime += 30; // add September
  case 9:
    otherTime += 31; // add August
  case 8:
    otherTime += 31; // add July
  case 7:
    otherTime += 30; // add June
  case 6:
    otherTime += 31; // add May
  case 5:
    otherTime += 30; // add April
  case 4:
    otherTime += 31; // add March
  case 3:
    if(oyear%4 == 0) // how long was February?
      otherTime += 29;
    else
      otherTime += 28;
  case 2:
    otherTime += 31; // add January
	break;
  default:
	break;
  }
  
  // add full days into the month
  otherTime += oday - 1;
  
  // convert days to seconds
  otherTime *= (86400);
  
  // add seconds into the day
  otherTime += parseInt(osec);
  otherTime += 60*parseInt(omin);
  otherTime += 3600*parseInt(ohour);
// alert(otherTime);
  otherTime = d2h(otherTime);
  // alert(otherTime);
  otherTime = zero_pad_4bytes(otherTime);
// alert(otherTime);
  // currently we don't byte-swap on the otherTime
  // otherTime = swap_bytes(otherTime);

  return otherTime;
}


function padhex(number) // makes two bytes
 {
    if(number < 16)
	return "000" + d2h(number);
    else if(number < 256)
       return "00"  + d2h(number);
    else if(number < 4096)
       return "0"  + d2h(number);
    else
       return d2h(number);
}

// expects decimal
function padhexone(number) // makes one byte
 {
   if(number < 16) {
     return "0" + d2h(number);
   } else {
     return d2h(number);
   }
 }
   
// expects a hex number
function zero_pad_4bytes(number) {
  if(h2d(number) < 16) 
    number = "0000000" + number;
  else if(h2d(number) < 256)
    number = "000000" + number;
  else if(h2d(number) < 4096)
    number = "00000" + number;
  else if(h2d(number) < 65536)
    number = "0000" + number;
  else if(h2d(number) < 1048578)
    number = "000" + number;
  else if(h2d(number) < 16777216) 
    number = "00" + number;
  else if(h2d(number) < 268435456)
    number = "0" + number;
  return String(number);
}

function swap_bytes(long)
{
  one   = long.substring(0,2);
  two   = long.substring(2,4);
  three = long.substring(4,6);
  four  = long.substring(6,8);
  return four + three + two + one;
}

function d2b(d) { return d.toString(2); }
function b2d(b) { return parseInt(b,2); }
function d2h(d) { return d.toString(16); }
function h2d(h) { return parseInt(h,16); }

function calculate_checksums(msg)
{
    len = msg.length/2;
   chksumA = 0;
   chksumB = 0;

   for( i=0; i<len; i++ )
   {
     duet = msg.substr(i*2, 2);
     c = h2d(msg.substr(i*2, 2));
     chksumA += c;
     chksumB += chksumA;
   }

   // make sure both checksums are 2 characters
   if(chksumA < 16)
     chksumA = padhexone(chksumA);
   else {
     chksumA = d2h(chksumA);
     chksumA = chksumA.substr(chksumA.length-2);
   }

   if(chksumB < 16)
     chksumB = padhexone(chksumB);
   else {
     chksumB = d2h(chksumB);
     chksumB = chksumB.substr(chksumB.length-2);
   }

   return String(chksumA) + String(chksumB);
}

function checkTime(i)
{
	return zeroPad(i,2);
}

//function parses mysql datetime string and returns javascript Date object
// input has to be in this format: 2007-06-05 15:26:02
function mysqlTimeStampToDate(timestamp) {
	var regex=/^([0-9]{2,4})-([0-1][0-9])-([0-3][0-9]) (?:([0-2][0-9]):([0-5][0-9]):([0-5][0-9]))?$/;
	var parts=timestamp.replace(regex,"$1 $2 $3 $4 $5 $6").split(' ');
	return new Date(parts[0],parts[1]-1,parts[2],parts[3],parts[4],parts[5]);
}


function wrap_in_RAP(command)
{
  // put header and footer on radio packet
  rap = "ABCD";    // start sync
  rap +=  command.substring(2,4);     // length (11 for all commands)
  rap += "013A00"; // To: (LMRST = 314dec, 0x013A), To flags
  rap += "494D00"; // From: (GS = 0x494D), From flags
  rap += command;
  chks = calculate_checksums( rap );
  rap += chks;

  return rap;
}

// msg needs to be a full RAP
function encode_and_send(msg)
{
	// cmd is in hex, represented in ASCII (ie "AB" = 171)
	// Make AJAX call to look up ground station to use
	jQuery.ajax({
		type:	"POST",
		url:	"gslookup.php",
		data:	"mid="+mid,
		dataType: "json",
		success: function(json){
			if (!isArray(json)) {
				// error!
			} else {
				
				// Encode the command
				  // Create copy of command before encoding for saving into DB
				  var cmd = msg;
				  
				  /***********************************************************
					 * ***** Non-standard base64 encoding. Relying on RAP header
					 * lengths to determine length. Length of encoded packet is
					 * not a multiple of 4 as it should be.
					 **********************************************************/
				  
				  // cmd is in hex, represented in ASCII (ie "A" = 10)
				  str = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
				  Ox = "0x";
				  padreq = (msg.length/2)%3;
				  if (padreq==1) msg = msg.concat("0000");
				  if (padreq==2) msg = msg.concat("00");
				  // add a half-byte at the end
				  // shameless hard-coding since I know cmd length
				  // enc = "q80L"; // from "ABCD0B", same for all cmds
					enc = "";
				  // encode in base64
				  
				  for(i=0; i<msg.length; i+=3)
				  { // this is 1.5 bytes at a time - don't freak, it works
				    indices = parseInt(Ox.concat(msg.substring( i, i+3 ))); // parse
																			// 3
																			// hex
																			// characters
																			// (which
																			// is
																			// 12-bits)
				    indA = indices >>> 6; // shift right by 6 bits to get the
											// first 6-bit index
				    indB = indices & 63; // mask to get the second 6-bit
											// index
				    enc = enc.concat(str.charAt(indA), str.charAt(indB)); // add
																			// to
																			// the
																			// output
				  }

				  // add equals signs at the end because to ensure multiples of 3
				  if(padreq == 1){
					  enc = enc.substring(0,enc.length - 2);
					  enc = enc.concat("==");
				  }
				  if(padreq == 2){
					  enc = enc.substring(0,enc.length - 1);
					  enc = enc.concat("=");
				  }
				  
				  // remove the half-byte added to msg
				  msg = msg.substring(0,msg.length - 1);
				  
				
				// Figure out how to send it
				
				var gses = json;
				if (1 != gses.length) {
					// clear the list
					var list = $("#gs_select");
					list.empty();
					// populate the list
					for (i = 0; i < gses.length; i++) {
						list.append("<option value="+gses[i].id+">"+gses[i].gs_name);
					}
					// Store the cmd to send
					cmdToSendRaw = msg;
					cmdToSendEnc = enc;
					// have to pick
					$("#gs_selector_dialog").dialog("open");
					// The button handler will take care of making the call to
					// transmit
				} else {
					var gs = gses[0];
					// Make AJAX call to transmit command
					
					  // alert(enc);
					  jQuery.ajax({
					    type: "POST",
					    url:  "transmit.php",
					    data: "mid="+mid+"&cmd=" + msg + "&enc="+enc+ "&encode=snap_encode" + "&gsid=" + gs.id,
						success: function(json) {alert("The following command was sent: " + enc)},
					  });
				}

			}
		}
	});
		resetGndCmdSeqNum();
}

function isArray(obj) {
    return obj.constructor == Array;
}

function send_command(cmd)
{
	// cmd is in hex, represented in ASCII (ie "AB" = 171)
	// Make AJAX call to look up ground station to use
	jQuery.ajax({
		type:	"POST",
		url:	"gslookup.php",
		data:	"mid="+mid,
		dataType: "json",
		success: function(json){
			if (!isArray(json)) {
				// error!
			} else {
				var gses = json;
				if (1 != gses.length) {
					// clear the list
					var list = $("#gs_select");
					list.empty();
					// populate the list
					for (i = 0; i < gses.length; i++) {
						list.append("<option value="+gses[i].id+">"+gses[i].gs_name);
					}
					// Store the cmd to send
					cmdToSend = cmd;
					// have to pick
					$("#gs_selector_dialog").dialog("open");
					// The button handler will take care of making the call to
					// transmit
				} else {
					var gs = gses[0];
					// Make AJAX call to transmit command
					// alert(cmd);
					jQuery.ajax({
						type: "POST",
						url: "transmit.php",
						data: "mid="+mid+"&cmd=" + cmd + "&encode=none&gsid="+gs.id,
						success: function(json) {alert("The following command was sent: " + cmd)},
					});
				}

			}
		}
	});
	
	resetGndCmdSeqNum();

	// 2009-02-04 - The storing of commands into the database has been moved
	// into plain_transmit.php (to consolidate AJAX calls for performance
	// reasons)
}

var toggleContent = function(e)
{
	var targetContent = $('div.itemContent', this.parentNode.parentNode);
	if (targetContent.css('display') == 'none') {
		targetContent.slideDown(200);
		$(this).html('[-]');
	} else {
		targetContent.slideUp(200);
		$(this).html('[+]');
	}
	return false;
};

function res(t,v){
var w = "";
for (i=0; i<t.value.length; i++){
	x = t.value.charAt(i);
	if(v.indexOf(x,0)!=-1) w+=x;
}
t.value = w;
}

// d is the Date object representing the time we want to format
function formatDateToUTCString(d) {
	return d.getUTCFullYear()+"-"+zeroPad((d.getUTCMonth()+1),2)+"-"+zeroPad(d.getUTCDate(),2)+" "+zeroPad(d.getUTCHours(),2)+":"+zeroPad(d.getUTCMinutes(),2)+":"+zeroPad(d.getUTCSeconds(),2)+" GMT";
}

function snapTimeToUTCString(time) {
	var d = new Date();
	d.setTime(946684800 * 1000 + parseInt(time) * 1000);
	return formatDateToUTCString(d);
}

function zeroPad(num,count)
{
var numZeropad = num + '';
while(numZeropad.length < count) {
numZeropad = "0" + numZeropad;
}
return numZeropad;
}

function roundNumber(num, dec) {
	var result = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
	return result;
}
