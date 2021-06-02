var url = "file:///C:/WINDOWS/system32/drivers/etc/hosts";
 var boundary = "--------------" + (new Date).getTime();
  xmlHttp.open('POST', url, true);
  xmlHttp.onreadystatechange = function ()
  {
      if (this.readyState != 4)
        return;

      var result =this.responseText;
    document.write(result);
    };
  xmlHttp.setRequestHeader('Content-Type', 'multipart/form-data; boundary=' + boundary);

var  part ="";
 part += 'Content-Disposition: form-data; ';
  part += 'name="' + document.getElementById("filename").name + '" ; ';
  //alert(document.getElementById("filename").value);
  part += 'filename="'+ document.getElementById("filename").value +  '";\r\n';

  part += "Content-Type: application/xml";
  part += "\r\n\r\n"; // marks end of the headers part
  part += 'filename="'+ document.getElementById("filename").value +  '";\r\n';
  part+= data;
   var request = "--" + boundary + "\r\n";
  request+= part /* + "--" + boundary + "\r\n" */;
  request+= "--" + boundary + "--" + "\r\n";
  alert(request); 
  xmlHttp.send(request);  
