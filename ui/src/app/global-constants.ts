export class GlobalConstants {
  public static stages:String[] = ["Connection", "Data Preperation", "Build", "Train", "Test", "Deploy", "Validate"]
  public static No_database_Session : String = "database-connection-err" ;
  public static No_columns_Session:String =  "col-session-err";
  public static No_db_Session:String =  "db-session-err";
  public static No_table_Session:String =  "tale-session-err";
  public static No_Config_File:String =  "config-file-missing";
  public static Config_File_Incorrect_Format:String =  "config-file-incorrect";
  public static Missing_Required_Input :String =  "missing-required-input";
  public static Error_500 :String =  "error-500"

}
