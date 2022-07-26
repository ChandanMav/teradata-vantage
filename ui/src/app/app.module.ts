import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './common/header/header.component';
import { FooterComponent } from './common/footer/footer.component';
import { NavComponent } from './common/nav/nav.component';
import { AppService } from './service/common/app.service';
import { ConnectionComponent } from './connection/connection.component';
import { DataPreperationComponent } from './data-preperation/data-preperation.component';
import { VantageHomeComponent } from './vantage-home/vantage-home.component';
import { AppHomeComponent } from './app-home/app-home.component';
import { ServerConnectionService } from './service/server-connection-service.service';
import { HttpClientModule } from '@angular/common/http';
import { VantageService } from './service/vantage.service';
import { FileUploadService } from './service/file-upload.service';
import { CommaSeperatedPipe } from './pipes/comma-seperated.pipe';
import { JsonReaderPipe } from './pipes/json-reader.pipe';
import { ExtactDataPipe } from './pipes/extact-data.pipe';
import { NgDragDropModule } from 'ng-drag-drop';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    FooterComponent,
    NavComponent,
    ConnectionComponent,
    DataPreperationComponent,
    VantageHomeComponent,
    AppHomeComponent,
    CommaSeperatedPipe,
    JsonReaderPipe,
    ExtactDataPipe
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    HttpClientModule,
    NgDragDropModule.forRoot()
  ],
  providers: [AppService, ServerConnectionService, VantageService, FileUploadService],
  bootstrap: [AppComponent]
})
export class AppModule { }
