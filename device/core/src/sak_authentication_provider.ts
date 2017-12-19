// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { EventEmitter } from 'events';
import { AuthenticationProvider, AuthenticationType, ConnectionString, SharedAccessSignature, errors, TransportConfig, encodeUriComponentStrict } from 'azure-iot-common';

/**
 * Provides an `AuthenticationProvider` object that can be created simply with a connection string and is then used by the device client and transports to authenticate
 * with the Azure IoT hub instance.
 *
 * The `SharedAccessKeyAuthenticationProvider` object takes care of creating shared access signature tokens on a regular cadence and emits the `newTokenAvailable` event for the transports
 * to renew their credentials with the Azure IoT hub instance and stay connected.
 */
export class SharedAccessKeyAuthenticationProvider extends EventEmitter implements AuthenticationProvider {
  type: AuthenticationType = AuthenticationType.Token;

  private _tokenValidTimeInSeconds: number = 3600;   // 1 hour
  private _tokenRenewalMarginInSeconds: number = 900; // 15 minutes

  private _currentTokenExpiryTimeInSeconds: number;
  private _renewalTimeout: NodeJS.Timer;

  private _credentials: TransportConfig;

  /**
   * @private
   *
   * Initializes a new instance of the TokenAuthenticationProvider - users should only use the factory methods though.
   *
   * @param credentials                    Credentials to be used by the device to connect to the IoT hub.
   * @param tokenValidTimeInSeconds        [optional] The number of seconds for which a token is supposed to be valid.
   * @param tokenRenewalMarginInSeconds    [optional] The number of seconds before the end of the validity period during which the `SharedAccessKeyAuthenticationProvider` should renew the token.
   */
  constructor(credentials: TransportConfig, tokenValidTimeInSeconds?: number, tokenRenewalMarginInSeconds?: number) {
    super();
    /*Codes_SRS_NODE_SAK_AUTH_PROVIDER_16_001: [The `constructor` shall create the initial token value using the `credentials` parameter.]*/
    this._credentials  = credentials;

    if (tokenValidTimeInSeconds) this._tokenValidTimeInSeconds = tokenValidTimeInSeconds;
    if (tokenRenewalMarginInSeconds) this._tokenRenewalMarginInSeconds = tokenRenewalMarginInSeconds;

    /*Codes_SRS_NODE_SAK_AUTH_PROVIDER_16_011: [The `constructor` shall throw an `ArgumentError` if the `tokenRenewalMarginInSeconds` is less than or equal `tokenValidTimeInSeconds`.]*/
    if (this._tokenValidTimeInSeconds <= this._tokenRenewalMarginInSeconds) {
      throw new errors.ArgumentError('tokenRenewalMarginInSeconds must be less than tokenValidTimeInSeconds');
    }

    /*Codes_SRS_NODE_SAK_AUTH_PROVIDER_16_002: [The `constructor` shall start a timer that will automatically renew the token every (`tokenValidTimeInSeconds` - `tokenRenewalMarginInSeconds`) seconds if specified, or 45 minutes by default.]*/
    this._renewToken();
  }

  /**
   * This method is used by the transports to gets the most current device credentials in the form of a `TransportConfig` object.
   *
   * @param callback function that will be called with either an error or a set of device credentials that can be used to authenticate with the IoT hub.
   */
  getDeviceCredentials(callback: (err: Error, credentials: TransportConfig) => void): void {
    if (this._shouldRenewToken()) {
      this._renewToken();
    }

    /*Codes_SRS_NODE_SAK_AUTH_PROVIDER_16_003: [The `getDeviceCredentials` should call its callback with a `null` first parameter and a `TransportConfig` object as a second parameter, containing the latest valid token it generated.]*/
    callback(null, this._credentials);
  }

  private _shouldRenewToken(): boolean {
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    return (this._currentTokenExpiryTimeInSeconds - currentTimeInSeconds) < this._tokenRenewalMarginInSeconds;
  }

  private _renewToken(): void {
    if (this._renewalTimeout) {
      clearTimeout(this._renewalTimeout);
    }

    /*Codes_SRS_NODE_SAK_AUTH_PROVIDER_16_009: [Every token shall be created with a validity period of `tokenValidTimeInSeconds` if specified when the constructor was called, or 1 hour by default.]*/
    const newExpiry =  Math.floor(Date.now() / 1000) + this._tokenValidTimeInSeconds;

    /*Codes_SRS_NODE_SAK_AUTH_PROVIDER_16_010: [Every token shall be created using the `azure-iot-common.SharedAccessSignature.create` method and then serialized as a string, with the arguments to the create methods being:
    ```
    resourceUri: <IoT hub host>/devices/<deviceId>
    keyName: the `SharedAccessKeyName` parameter of the connection string or `null`
    key: the `SharedAccessKey` parameter of the connection string
    expiry: the expiration time of the token, which is now + the token validity time, formatted as the number of seconds since Epoch (Jan 1st, 1970, 00:00 UTC).
    ```]*/
    const resourceUri = encodeUriComponentStrict(this._credentials.host + '/devices/' + this._credentials.deviceId);
    const sas = SharedAccessSignature.create(resourceUri, this._credentials.sharedAccessKeyName, this._credentials.sharedAccessKey, newExpiry);
    this._credentials.sharedAccessSignature = sas.toString();

    const nextRenewalTimeout = (this._tokenValidTimeInSeconds - this._tokenRenewalMarginInSeconds) * 1000;
    this._renewalTimeout = setTimeout(() => this._renewToken(), nextRenewalTimeout);
    /*Codes_SRS_NODE_SAK_AUTH_PROVIDER_16_005: [Every time a new token is created, the `newTokenAvailable` event shall be fired with the updated credentials.]*/
    this.emit('newTokenAvailable', this._credentials);
  }

  /**
   * Creates a new `SharedAccessKeyAuthenticationProvider` from a connection string
   *
   * @param connectionString              A device connection string containing the required parameters for authentication with the IoT hub.
   * @param tokenValidTimeInSeconds       [optional] The number of seconds for which a token is supposed to be valid.
   * @param tokenRenewalMarginInSeconds   [optional] The number of seconds before the end of the validity period during which the `SharedAccessKeyAuthenticationProvider` should renew the token.
   */
  static fromConnectionString(connectionString: string, tokenValidTimeInSeconds?: number, tokenRenewalMarginInSeconds?: number): SharedAccessKeyAuthenticationProvider {
    if (!connectionString) {
      /*Codes_SRS_NODE_SAK_AUTH_PROVIDER_16_006: [The `fromConnectionString` method shall throw a `ReferenceError` if the `connectionString` parameter is falsy.]*/
      throw new ReferenceError('connectionString cannot be \'' + connectionString + '\'');
    }

    /*Codes_SRS_NODE_SAK_AUTH_PROVIDER_16_007: [The `fromConnectionString` method shall throw an `errors.ArgumentError` if the `connectionString` does not have a SharedAccessKey parameter.]*/
    const cs: ConnectionString = ConnectionString.parse(connectionString, ['DeviceId', 'HostName', 'SharedAccessKey']);

    /*Codes_SRS_NODE_SAK_AUTH_PROVIDER_16_008: [The `fromConnectionString` method shall extract the credentials from the `connectionString` argument and create a new `SharedAccessKeyAuthenticationProvider` that uses these credentials to generate security tokens.]*/
    const credentials: TransportConfig = {
      host: cs.HostName,
      deviceId: cs.DeviceId,
      sharedAccessKeyName: cs.SharedAccessKeyName,
      sharedAccessKey: cs.SharedAccessKey
    };

    return new SharedAccessKeyAuthenticationProvider(credentials, tokenValidTimeInSeconds, tokenRenewalMarginInSeconds);
  }
}