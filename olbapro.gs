function doPost(request) {
  var user=Autenticate(request.parameter.user,request.parameter.password);
  var txt=request.postData.contents;
  var arr=JSON.parse(txt);
  
  try{
    for (var i=0;i<arr.length;i++){
      if (arr[i].operation=="Update"){     
        Update(user,arr[i]);
      }
      else if (arr[i].operation=="Insert"){   
        Insert(user,arr[i]);
      }else if (arr[i].operation=="Delete"){
        Delete(user,arr[i]);
      }else{
        throw "I don´t understand the operation";
      }
    }    
    return ContentService.createTextOutput(JSON.stringify({lastError:""})).setMimeType(ContentService.MimeType.JSON); 
  }
  catch(err){

    return ContentService.createTextOutput(JSON.stringify({lastError:err})).setMimeType(ContentService.MimeType.JSON); 
  }
  
}

function doGet(request) {
  try
  {  
    var user=Autenticate(request.parameter.user,request.parameter.password);
    var method=request.parameter.method;
    
    if (method=="getTable"){
      if (user[request.parameter.table]=='read' || user[request.parameter.table]=='write'){
        var table=request.parameter.table;
        var data=getDataJson(table);
        getDataDetailJson(data,table);
        return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); 
      }else{
        throw "You don´t have privileges to perform this operation";
      }
    }else if (method=="login"){
      return ContentService.createTextOutput(JSON.stringify({})).setMimeType(ContentService.MimeType.JSON); 
    }
  }
  catch(ex){
    return ContentService.createTextOutput(JSON.stringify({"lastError":ex})).setMimeType(ContentService.MimeType.JSON); 
  }
}

function Autenticate(user,password){
  var spr=getSpreadSheet("USERS");
  
  var obj=getByID(spr,user);
  
  if (obj==null){
    throw "User or password incorrect";
  }else{
    if (obj.password!=password){
      throw "User or password incorrect";
    }
  }
  
  return obj;
}


function myFunction() {
  Autenticate("manager","secure2");
}


function Delete(user,obj){
  if ( user[obj.table]=='write'){
    var hoja=getSpreadSheet(obj.table);
    
    if (obj.key2==null || obj.key2==""){
      var pos=buscarFila(hoja,obj.key);
      if (pos!=-1){      
        var pos=removeRow(hoja,obj.key);          
        removeAllDetail(obj.table,obj.key);          
        
        var hojaAudit=getSpreadSheet("AUDIT");
        var objAudit={user:user.user,date:toDay(),table:obj.table,key:obj.key,key2:"",operation:obj.operation,newvalues:{},oldvalues:{}};
        audit(hojaAudit,objAudit);
        
      }    
    }else{ /* Two key table */
      var pos=buscarFila2(hoja,obj.key,obj.key2);
      if (pos!=-1){      
        removeRow2(hoja,obj.key,obj.key2);          
        
        var hojaAudit=getSpreadSheet("AUDIT");
        var objAudit={user:user.user,date:toDay(),table:obj.table,key:obj.key,key2:obj.key2,operation:obj.operation,newvalues:{},oldvalues:{}};
        audit(hojaAudit,objAudit);
      }    
      
    }
  }else{
    throw "You don´t have privileges to perform this operation"
  }
}


function Update(user,obj){
  if ( user[obj.table]=='write'){
    var hoja=getSpreadSheet(obj.table);
    
    if (obj.operation=="Update"){
      if (obj.key2==null || obj.key2==""){
        var pos=buscarFila(hoja,obj.key);
        if (pos!=-1){      
          if (checkOldValues(hoja,obj.oldvalues,pos)){
            updateRowPos(hoja,obj.newvalues,pos);
            
            var hojaAudit=getSpreadSheet("AUDIT");
            var objAudit={user:user.user,date:toDay(),table:obj.table,key:obj.key,key2:"",operation:obj.operation,newvalues:JSON.stringify(obj.newvalues),oldvalues:JSON.stringify(obj.oldvalues)};
            audit(hojaAudit,objAudit);
          }
        }    
      }else{ /* Two key table */
        var pos=buscarFila2(hoja,obj.key,obj.key2);
        if (pos!=-1){      
          if (checkOldValues(hoja,obj.oldvalues,pos)){
            updateRowPos(hoja,obj.newvalues,pos);
            
            var hojaAudit=getSpreadSheet("AUDIT");
            var objAudit={user:user.user,date:toDay(),table:obj.table,key:obj.key,key2:obj.key2,operation:obj.operation,newvalues:JSON.stringify(obj.newvalues),oldvalues:JSON.stringify(obj.oldvalues)};
            audit(hojaAudit,objAudit);
          }
        }    
        
      }
    }
  }else{
     throw "You don´t have privileges to perform this operation"
  }
}

function Insert(user,obj){
  if ( user[obj.table]=='write'){
    var hoja=getSpreadSheet(obj.table);
    
    if (obj.operation=="Insert"){
      if (obj.key2==null || obj.key2==""){
        
        var pos=buscarFila(hoja,obj.key);
        if (pos==-1){      
          
          addNew(hoja,obj.newvalues);
          
          var hojaAudit=getSpreadSheet("AUDIT");
          var objAudit={user:user.user,date:toDay(),table:obj.table,key:obj.key,key2:"",operation:obj.operation,newvalues:JSON.stringify(obj.newvalues),oldvalues:{}};
          audit(hojaAudit,objAudit);
        }
        else{
          throw "This record exists";
        }
      }else{ /* Doble Fila */
        var pos=buscarFila2(hoja,obj.key,obj.key2);
        if (pos==-1){      
          
          addNew2(hoja,obj.newvalues);
          
          var hojaAudit=getSpreadSheet("AUDIT");
          var objAudit={user:user.user,date:toDay(),table:obj.table,key:obj.key,key2:obj.key2,operation:obj.operation,newvalues:JSON.stringify(obj.newvalues),oldvalues:{}};
            audit(hojaAudit,objAudit);
        }
        else{
          throw "This record exists";
        }
      }
    }    

  }else{
    throw "You don´t have privileges to perform this operation"
  }
}

function test(){
      var table="OCRD";
      var data=getDataJson(table);
      getDataDetailJson(data,table);

   
}


function getSpreadSheet(table){
  var id=PropertiesService.getScriptProperties().getProperty("SpreadID");
  return SpreadsheetApp.openById(id).getSheetByName(table);
}

function GetPKColumns(tableName){
  if (tableName[tableName.length-1]=="2"){
    return 2;
  }else{
    return 1;
  }
}


function allTables(){
  var id=PropertiesService.getScriptProperties().getProperty("SpreadID");
  var sp= SpreadsheetApp.openById(id)
  
  var salida=[];
  
  for (var i=0;i<sp.getNumSheets();i++){
    salida.push(sp.getSheets()[i].getName());
  }
  return salida;
}
  
function nuevaFila(spr){
  var column = spr.getRange('A:A');
  var values = column.getValues(); // get all data in one call
  
  var ct = 0;
  while ( values[ct][0] != "" ) {
    ct++;
  }
 
 return ct; 
 
}

function buscarFila(spr,valor) {
 
  var column = spr.getRange('A:A');
  var values = column.getValues(); // get all data in one call
  
  var ct = 0;
  while ( values[ct][0] != ""  && values[ct][0] != valor) {
    ct++;
  }
  if (values[ct][0]=="")
  {
    return -1;
  }
  else
  {
    return ct; 
  }
}

function buscarFila2(spr,valor,valor2) {
 
  var column = spr.getRange('A:B');
  var values = column.getValues(); // get all data in one call
  
  var ct = 0;
  while ( values[ct][0] != ""  && (values[ct][0] != valor || values[ct][1] != valor2)) {
    ct++;
  }
  if (values[ct][0]=="")
  {
    return -1;
  }
  else
  {
    return ct; 
  }
}



function getByID(spr,valor){
  var pos=buscarFila(spr,valor);

  if (pos!=-1){  
    var columns=spr.getLastColumn();
    var encabezado = spr.getRange(1, 1, 1, columns).getValues()
    var datos = spr.getRange(pos+1, 1, 1, columns).getValues()
    var salida={};

    for (var i=0;i<columns;i++){
      salida[encabezado[0][i]]=datos[0][i];
    }
    return salida;
  }
  else{
    return null;
  }
}

function getByID2(spr,valor,valor2){
  var pos=buscarFila2(spr,valor,valor2);

  if (pos!=-1){  
    var columns=spr.getLastColumn();
    var encabezado = spr.getRange(1, 1, 1, columns).getValues()
    var datos = spr.getRange(pos+1, 1, 1, columns).getValues()
    var salida={};

    for (var i=0;i<columns;i++){
      salida[encabezado[0][i]]=datos[0][i];
    }
    return salida;
  }
  else{
    return null;
  }
}


function audit(spr,obj){
  var columns=spr.getLastColumn();
  var encabezado = spr.getRange(1, 1, 1, columns).getValues()
  

  var fila=nuevaFila(spr);
  
  var datos = spr.getRange(fila+1, 1, 1, columns).getValues()
  
  for (var i=0;i<columns;i++){
    datos[0][i]=obj[encabezado[0][i]];
  }
  spr.getRange(fila+1, 1, 1, columns).setValues(datos);
  
  return true;
  
}
function addNew(spr,obj){
  var columns=spr.getLastColumn();
  var encabezado = spr.getRange(1, 1, 1, columns).getValues()
  
  var id=obj[encabezado[0][0]];
  var pos=buscarFila(spr,id);
  
  if (pos!=-1){
     throw "Ya existen un elemento con este código";
  }
  else{
    var fila=nuevaFila(spr);
    
    var datos = spr.getRange(fila+1, 1, 1, columns).getValues()
    
    for (var i=0;i<columns;i++){
      datos[0][i]=obj[encabezado[0][i]];
    }
    spr.getRange(fila+1, 1, 1, columns).setValues(datos);
    
    return true;
  }                               
}

function addNew2(spr,obj){
  var columns=spr.getLastColumn();
  var encabezado = spr.getRange(1, 1, 1, columns).getValues()
  
  var id=obj[encabezado[0][0]];
  var id2=obj[encabezado[0][1]];
  var pos=buscarFila2(spr,id,id2);
  
  if (pos!=-1){
     throw "Ya existen un elemento con este código";
  }
  else{
    var fila=nuevaFila(spr);
    
    var datos = spr.getRange(fila+1, 1, 1, columns).getValues()
    
    for (var i=0;i<columns;i++){
      datos[0][i]=obj[encabezado[0][i]];
    }
    spr.getRange(fila+1, 1, 1, columns).setValues(datos);
    
    return true;
  }                               
}

function updateRow(spr,obj){
  var columns=spr.getLastColumn();
  var encabezado = spr.getRange(1, 1, 1, columns).getValues()

  var id=obj[encabezado[0][0]];
  var pos=buscarFila(spr,id);
  
  if (pos!=-1){
    var datos = spr.getRange(pos+1, 1, 1, columns).getValues()
    
    for (var i=0;i<columns;i++){
      if (obj[encabezado[0][i]]!=null){
        datos[0][i]=obj[encabezado[0][i]];
       }
    }
    spr.getRange(pos+1, 1, 1, columns).setValues(datos);
    
    return true;
  }
  else{
    throw "Elemento no encontrado";   
  }                               
}

function updateRowPos(spr,obj,pos){
  var columns=spr.getLastColumn();
  var encabezado = spr.getRange(1, 1, 1, columns).getValues()

  if (pos!=-1){
    var datos = spr.getRange(pos+1, 1, 1, columns).getValues()
    
    for (var i=0;i<columns;i++){
      if (obj[encabezado[0][i]]!=null){
        datos[0][i]=obj[encabezado[0][i]];
       }
    }
    spr.getRange(pos+1, 1, 1, columns).setValues(datos);
    
    return true;
  }
  else{
    throw "Elemento no encontrado";   
  }                               
}

function checkOldValues(spr,obj,pos){
  var columns=spr.getLastColumn();
  var encabezado = spr.getRange(1, 1, 1, columns).getValues()

  if (pos!=-1){
    Logger.log("Entro");
    var datos = spr.getRange(pos+1, 1, 1, columns).getValues()
    
    for (var i=0;i<columns;i++){
       Logger.log("Entro2");
      if (obj[encabezado[0][i]]!=null){
         Logger.log("Entro3");
        if (datos[0][i]!=obj[encabezado[0][i]]){
          throw "El campo "+encabezado[0][i]+" ha sido modificado por otro usuario";  
        }
       }
    }
       
    return true;
  }
  else{
    throw "Elemento no encontrado";   
  }                               
}

function updateRow2(spr,obj){
  var columns=spr.getLastColumn();
  var encabezado = spr.getRange(1, 1, 1, columns).getValues()

  var id=obj[encabezado[0][0]];
  var id2=obj[encabezado[0][1]];
  var pos=buscarFila2(spr,id,id2);
  
  if (pos!=-1){
    var datos = spr.getRange(pos+1, 1, 1, columns).getValues()
    
    for (var i=0;i<columns;i++){
      if (obj[encabezado[0][i]]!=null){
        datos[0][i]=obj[encabezado[0][i]];
       }
    }
    spr.getRange(pos+1, 1, 1, columns).setValues(datos);
    
    return true;
  }
  else{
    throw "Elemento no encontrado";   
  }                               
}




function createTable(tableName){
  tableName=tableName.toUpperCase();
  var id=PropertiesService.getScriptProperties().getProperty("SpreadID");
  var sp= SpreadsheetApp.openById(id);
  
  var sheet=sp.getSheetByName(tableName);
  if (sheet==null){
    var sheet=sp.insertSheet(tableName);
    return true;
  }else{
    throw "Table exists";
  }
}

function getColumns(sheet){
}

function createColumn(tableName,columnName){
  var sheet=getSpreadSheet(tableName);
  columnName=columnName.toUpperCase();
   
  if (sheet!=null){
    var columnsRange=sheet.getRange("1:1")
    var values=columnsRange.getValues();
    
    var pos=values[0].indexOf(columnName);
    if (values[0].indexOf(columnName)!=-1){
      throw "Column exists";
    }else{
       var ct = 0;
      while ( values[0][ct] != "" ) {
        ct++;
      }
      
      values[0][ct]=columnName;
      columnsRange.setValues(values);

    }
    return true;
  }else{
    throw "Table doesn´t exists";
  }
}

function getColumns(tableName){
  var sheet=getSpreadSheet(tableName);
  
  if (sheet!=null){
    var columnsRange=sheet.getRange("1:1")
    var values=columnsRange.getValues();
    var salida=[];
    
    ct=0;
    
    for (var i=0;i<values[0].length;i++){
      if (values[0][i]!=""){
        salida.push(values[0][i])
      }
    }    
    return salida;
  }
  else{
    throw "Table doesn´t exists";
  }  
}



function getDictionary(){
  var tables=allTables();
  var salida=[];
  
  for (var i=0;i<tables.length;i++){
    var columns=getColumns(tables[i]);
    
    var obj={"tableName":tables[i],"columns":columns,"keys":GetPKColumns(tables[i])};
    
    salida.push(obj);
  }
  
  return salida;
}

function getData(tableName){
  var spr= getSpreadSheet(tableName)
  var nueva=nuevaFila(spr);
  var columns=spr.getLastColumn();
  var datos=[];
  
  if (nueva>1){
    var datos = spr.getRange(2, 1, nueva-1, columns).getValues()
   }
  
  return datos;
}

function getDataJson(tableName){
  var data=getData(tableName);
  var salida=[];
  
  var columns=getColumns(tableName);
  
  for (var i=0;i<data.length;i++){
    var arr=data[i];
    
    var obj={};
    for (var j=0;j<columns.length;j++){
      obj[columns[j]]=arr[j];
    }
    
    salida.push(obj);
  }
  
  return salida;
}

function getDataDetail(tableName){
  var data=getData(tableName);
  var salida={};
  
  var columns=getColumns(tableName);
  
  for (var i=0;i<data.length;i++){
    var arr=data[i];
    
    var obj={};
    for (var j=0;j<columns.length;j++){
      obj[columns[j]]=arr[j];
    }
    
    if ( salida[obj[columns[0]]]==null){
      salida[obj[columns[0]]]=[];
    }
    salida[obj[columns[0]]].push(obj);
  }
  
  return salida;
}

function getDataDetailTableJson(data,masterTable,tableName){
  var detail=getDataDetail(tableName);
  var columns=getColumns(masterTable);
  
  var idColumn=columns[0];
  
  for (var i=0;i<data.length;i++){
    var obj=data[i];
    
    if (detail[obj[idColumn]]!=null){
       obj[tableName]=detail[obj[idColumn]];
    }else{
       obj[tableName]=[];
    }
   
  }
}

function getDataDetailJson(data,tableName){
  var tables=allTables();
  
  for (var i=0;i<tables.length;i++){
    if (tables[i].indexOf(tableName+"_")==0){
      getDataDetailTableJson(data,tableName,tables[i]);
    }
  }
}

function toDay(){
  var today = new Date();
  var dd = today.getDate();
  var mm = today.getMonth()+1; //January is 0!
  var yyyy = today.getFullYear();
  
  if(dd<10) {
    dd='0'+dd
  } 
  
  if(mm<10) {
    mm='0'+mm
  } 
  
  return dd+"/"+mm+'/'+yyyy;
  
}

function removeRow(spr,key){
 
   var columns=spr.getLastColumn();
  var encabezado = spr.getRange(1, 1, 1, columns).getValues()

  var pos=buscarFila(spr,key);
  
  if (pos!=-1){
    spr.deleteRow(pos+1)    
    return true;
  }
  else{
    throw "Elemento no encontrado";   
  }                               
}

function removeAllDetail(tableName,key){
  var tables=allTables();
  
  for (var i=0;i<tables.length;i++){
    if (tables[i].indexOf(tableName+"_")==0){
      removeDetail(tables[i],key);
    }
  }
}

function removeDetail(tableName,key){
  var spr=getSpreadSheet(tableName);
  
  var column = spr.getRange('A:A');
  var values = column.getValues(); // get all data in one call
  
  var ct = 0;
  while ( values[ct][0] != "") {
    ct++;
  }
  
  for (var i=ct;i>0;i--){
    if (values[i][0]==key){
      spr.deleteRow(i+1);    
    }
  }
}