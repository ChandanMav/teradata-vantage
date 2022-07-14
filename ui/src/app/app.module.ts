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

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    FooterComponent,
    NavComponent,
    ConnectionComponent,
    DataPreperationComponent,
    VantageHomeComponent,
    AppHomeComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    HttpClientModule
  ],
  providers: [AppService, ServerConnectionService],
  bootstrap: [AppComponent]
})
export class AppModule { }
