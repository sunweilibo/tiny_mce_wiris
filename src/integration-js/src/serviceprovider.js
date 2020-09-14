import { MathML } from 'mathjax-full/js/input/mathml';
import { TeX } from 'mathjax-full/js/input/tex';
import { SVG } from 'mathjax-full/js/output/svg';
import { HTMLAdaptor } from 'mathjax-full/js/adaptors/HTMLAdaptor';
import { HTMLDocument } from 'mathjax-full/js/handlers/html/HTMLDocument';


import Util from './util';
import Listeners from './listeners';

const doc = new HTMLDocument(document, new HTMLAdaptor(window), {
  InputJax: new MathML({ forceReparse: true }),
  OutputJax: new SVG(),
});

/**
 * @typedef {Object} ServiceProviderProperties
 * @property {String} URI - Service URI.
 * @property {String} server - Service server language.
 */

/**
 * @classdesc
 * Class representing a serviceProvider. A serviceProvider is a class containing
 * an arbitrary number of services with the correspondent path.
 */
export default class ServiceProvider {
  /**
   * Returns Service Provider listeners.
   * @type {Listeners}
   */
  static get listeners() {
    return ServiceProvider._listeners;
  }

  /**
   * Adds a {@link Listener} instance to {@link ServiceProvider} class.
   * @param {Listener} listener - Instance of {@link Listener}.
   */
  static addListener(listener) {
    ServiceProvider.listeners.add(listener);
  }

  /**
   * Fires events in Service Provider.
   * @param {String} eventName - Event name.
   * @param {Event} event - Event object.
   */
  static fireEvent(eventName, event) {
    ServiceProvider.listeners.fire(eventName, event);
  }

  /**
   * Service parameters.
   * @type {ServiceProviderProperties}
   *
   */
  static get parameters() {
    return ServiceProvider._parameters;
  }

  /**
   * Service parameters.
   * @private
   * @type {ServiceProviderProperties}
   */
  static set parameters(parameters) {
    ServiceProvider._parameters = parameters;
  }

  /**
   * Static property.
   * Return service provider paths.
   * @private
   * @type {String}
   */
  static get servicePaths() {
    return ServiceProvider._servicePaths;
  }

  /**
   * Static property setter.
   * Set service paths.
   * @param {String} value - The property value.
   * @ignore
   */
  static set servicePaths(value) {
    ServiceProvider._servicePaths = value;
  }

  /**
   * Adds a new service to the ServiceProvider.
   * @param {String} service - Service name.
   * @param {String} path - Service path.
   * @static
   */
  static setServicePath(service, path) {
    ServiceProvider.servicePaths[service] = path;
  }

  /**
   * Returns the service path for a certain service.
   * @param {String} serviceName - Service name.
   * @returns {String} The service path.
   * @static
   */
  static getServicePath(serviceName) {
    return ServiceProvider.servicePaths[serviceName];
  }

  /**
   * Static property.
   * Service provider integration path.
   * @type {String}
   */
  static get integrationPath() {
    return ServiceProvider._integrationPath;
  }

  /**
   * Static property setter.
   * Set service provider integration path.
   * @param {String} value - The property value.
   * @ignore
   */
  static set integrationPath(value) {
    ServiceProvider._integrationPath = value;
  }

  /**
   * Returns the server URL in the form protocol://serverName:serverPort.
   * @return {String} The client side server path.
   */
  static getServerURL() {
    const url = window.location.href;
    const arr = url.split('/');
    const result = `${arr[0]}//${arr[2]}`;
    return result;
  }

  /**
   * Inits {@link this} class. Uses {@link this.integrationPath} as
   * base path to generate all backend services paths.
   * @param {Object} parameters - Function parameters.
   * @param {String} parameters.integrationPath - Service path.
   */
  static init(parameters) {
    ServiceProvider.parameters = parameters;
    // Services path (tech dependant).
    let configurationURI = ServiceProvider.createServiceURI('configurationjs');
    let createImageURI = ServiceProvider.createServiceURI('createimage');
    let showImageURI = ServiceProvider.createServiceURI('showimage');
    let getMathMLURI = ServiceProvider.createServiceURI('getmathml');
    let serviceURI = ServiceProvider.createServiceURI('service');

    // Some backend integrations (like Java o Ruby) have an absolute backend path,
    // for example: /app/service. For them we calculate the absolute URL path, i.e
    // protocol://domain:port/app/service
    if (ServiceProvider.parameters.URI.indexOf('/') === 0) {
      const serverPath = ServiceProvider.getServerURL();
      configurationURI = serverPath + configurationURI;
      showImageURI = serverPath + showImageURI;
      createImageURI = serverPath + createImageURI;
      getMathMLURI = serverPath + getMathMLURI;
      serviceURI = serverPath + serviceURI;
    }

    ServiceProvider.setServicePath('configurationjs', configurationURI);
    ServiceProvider.setServicePath('showimage', showImageURI);
    ServiceProvider.setServicePath('createimage', createImageURI);
    ServiceProvider.setServicePath('service', serviceURI);
    ServiceProvider.setServicePath('getmathml', getMathMLURI);
    ServiceProvider.setServicePath('configurationjs', configurationURI);

    ServiceProvider.listeners.fire('onInit', {});
  }

  /**
   * Gets the content from an URL.
   * @param {String} url - Target URL.
   * @param {Object} [postVariables] - Object containing post variables.
   * null if a GET query should be done.
   * @returns {String} Content of the target URL.
   * @private
   * @static
   */
  static getUrl(url, postVariables) {
    const currentPath = window.location.toString().substr(0, window.location.toString().lastIndexOf('/') + 1);
    const httpRequest = Util.createHttpRequest();

    if (httpRequest) {
      if (typeof postVariables === 'undefined' || typeof postVariables === 'undefined') {
        httpRequest.open('GET', url, false);
      } else if (url.substr(0, 1) === '/' || url.substr(0, 7) === 'http://' || url.substr(0, 8) === 'https://') {
        httpRequest.open('POST', url, false);
      } else {
        httpRequest.open('POST', currentPath + url, false);
      }

      if (typeof postVariables !== 'undefined' && postVariables) {
        httpRequest.setRequestHeader('Content-type', 'application/x-www-form-urlencoded; charset=UTF-8');
        httpRequest.send(Util.httpBuildQuery(postVariables));
      } else {
        httpRequest.send(null);
      }

      return httpRequest.responseText;
    }
    return '';
  }

  /**
   * Returns the response text of a certain service.
   * @param {String} service - Service name.
   * @param {String} postVariables - Post variables.
   * @param {Boolean} get - True if the request is GET instead of POST. false otherwise.
   * @returns {String} Service response text.
   */
  static getService(service, postVariables, get) {
    let response;
    if (service === 'showimage') {
      if (typeof postVariables === 'object') {
        try {
          response = this.convertMathMl2svg(postVariables.mml);
          return response;
        } catch (error) {
          console.info(error);
        }
      } else if (typeof postVariables === 'string') {
        return '{"status":"warning"}';
      }
    }
    if (get === true) {
      const serviceUrl = `${ServiceProvider.getServicePath(service)}?${postVariables}`;
      response = ServiceProvider.getUrl(serviceUrl);
    } else {
      const serviceUrl = ServiceProvider.getServicePath(service);
      response = ServiceProvider.getUrl(serviceUrl, postVariables);
    }
    return response;
  }

  static convertMathMl2svg(mathml) {
    // {"status":"ok","result":{"height":"37","width":"63","content":"<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:wrs=\"http://www.wiris.com/xml/cvs-extension\" height=\"37\" width=\"63\" wrs:baseline=\"27\"><!--MathML: <math xmlns=\"http://www.w3.org/1998/Math/MathML\"><mn>27</mn><mo>&#xB7;</mo><mo>&#x222B;</mo><mo>(</mo><mi>d</mi><mo>)</mo></math>--><defs><style type=\"text/css\">@font-face{font-family:'math1fb2c67c42b223bc9410ae80418';src:url(data:font/truetype;charset=utf-8;base64,AAEAAAAMAIAAAwBAT1MvMi7iBBMAAADMAAAATmNtYXDEvmKUAAABHAAAADxjdnQgDVUNBwAAAVgAAAA6Z2x5ZoPi2VsAAAGUAAAAuWhlYWQQC2qxAAACUAAAADZoaGVhCGsXSAAAAogAAAAkaG10eE2rRkcAAAKsAAAADGxvY2EAHTwYAAACuAAAABBtYXhwBT0FPgAAAsgAAAAgbmFtZaBxlY4AAALoAAABn3Bvc3QB9wD6AAAEiAAAACBwcmVwa1uragAABKgAAAAUAAADSwGQAAUAAAQABAAAAAAABAAEAAAAAAAAAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAgICAAAAAg1UADev96AAAD6ACWAAAAAAACAAEAAQAAABQAAwABAAAAFAAEACgAAAAGAAQAAQACALciK///AAAAtyIr////St3XAAEAAAAAAAAAAAFUAywAgAEAAFYAKgJYAh4BDgEsAiwAWgGAAoAAoADUAIAAAAAAAAAAKwBVAIAAqwDVAQABKwAHAAAAAgBVAAADAAOrAAMABwAAMxEhESUhESFVAqv9qwIA/gADq/xVVQMAAAEAgAFVAOsBwAADABsYAbAEELEAA/SxAgP0sQUD9ACwBBCxAwb0MDETMxUjgGtrAcBrAAEAS/9rAgsDQAAZAAABJg4BAwIOASMmNDYGIxY+ARMSPgEzFg4BNgH1NTUgICBANkAqVQs1NTYgICBANUArAVULAxUWK4v+4P7AiiAVQBVAFSuKASABQIsgFUAVPwAAAAABAAAAAQAA1XjOQV8PPPUAAwQA/////9Y6E3P/////1joTcwAA/yAEgAOrAAAACgACAAEAAAAAAAEAAAPo/2oAABdwAAD/tgSAAAEAAAAAAAAAAAAAAAAAAAADA1IAVQFrAIAB9ABLAAAAAAAAACgAAABbAAAAuQABAAAAAwBeAAUAAAAAAAIAgAQAAAAAAAQAAN4AAAAAAAAAFQECAAAAAAAAAAEAEgAAAAAAAAAAAAIADgASAAAAAAAAAAMAMAAgAAAAAAAAAAQAEgBQAAAAAAAAAAUAFgBiAAAAAAAAAAYACQB4AAAAAAAAAAgAHACBAAEAAAAAAAEAEgAAAAEAAAAAAAIADgASAAEAAAAAAAMAMAAgAAEAAAAAAAQAEgBQAAEAAAAAAAUAFgBiAAEAAAAAAAYACQB4AAEAAAAAAAgAHACBAAMAAQQJAAEAEgAAAAMAAQQJAAIADgASAAMAAQQJAAMAMAAgAAMAAQQJAAQAEgBQAAMAAQQJAAUAFgBiAAMAAQQJAAYACQB4AAMAAQQJAAgAHACBAE0AYQB0AGgAIABGAG8AbgB0AFIAZQBnAHUAbABhAHIATQBhAHQAaABzACAARgBvAHIAIABNAG8AcgBlACAATQBhAHQAaAAgAEYAbwBuAHQATQBhAHQAaAAgAEYAbwBuAHQAVgBlAHIAcwBpAG8AbgAgADEALgAwTWF0aF9Gb250AE0AYQB0AGgAcwAgAEYAbwByACAATQBvAHIAZQAAAwAAAAAAAAH0APoAAAAAAAAAAAAAAAAAAAAAAAAAALkHEQAAjYUYALIAAAAVFBOxAAE/)format('truetype');font-weight:normal;font-style:normal;}@font-face{font-family:'round_brackets18549f92a457f2409';src:url(data:font/truetype;charset=utf-8;base64,AAEAAAAMAIAAAwBAT1MvMjwHLFQAAADMAAAATmNtYXDf7xCrAAABHAAAADxjdnQgBAkDLgAAAVgAAAASZ2x5ZmAOz2cAAAFsAAABJGhlYWQOKih8AAACkAAAADZoaGVhCvgVwgAAAsgAAAAkaG10eCA6AAIAAALsAAAADGxvY2EAAARLAAAC+AAAABBtYXhwBIgEWQAAAwgAAAAgbmFtZXHR30MAAAMoAAACOXBvc3QDogHPAAAFZAAAACBwcmVwupWEAAAABYQAAAAHAAAGcgGQAAUAAAgACAAAAAAACAAIAAAAAAAAAQIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAgICAAAAAo8AMGe/57AAAHPgGyAAAAAAACAAEAAQAAABQAAwABAAAAFAAEACgAAAAGAAQAAQACACgAKf//AAAAKAAp////2f/ZAAEAAAAAAAAAAAFUAFYBAAAsAKgDgAAyAAcAAAACAAAAKgDVA1UAAwAHAAA1MxEjEyMRM9XVq4CAKgMr/QAC1QABAAD+0AIgBtAACQBNGAGwChCwA9SwAxCwAtSwChCwBdSwBRCwANSwAxCwBzywAhCwCDwAsAoQsAPUsAMQsAfUsAoQsAXUsAoQsADUsAMQsAI8sAcQsAg8MTAREAEzABEQASMAAZCQ/nABkJD+cALQ/ZD+cAGQAnACcAGQ/nAAAQAA/tACIAbQAAkATRgBsAoQsAPUsAMQsALUsAoQsAXUsAUQsADUsAMQsAc8sAIQsAg8ALAKELAD1LADELAH1LAKELAF1LAKELAA1LADELACPLAHELAIPDEwARABIwAREAEzAAIg/nCQAZD+cJABkALQ/ZD+cAGQAnACcAGQ/nAAAQAAAAEAAPW2NYFfDzz1AAMIAP/////Vre7u/////9Wt7u4AAP7QA7cG0AAAAAoAAgABAAAAAAABAAAHPv5OAAAXcAAA//4DtwABAAAAAAAAAAAAAAAAAAAAAwDVAAACIAAAAiAAAAAAAAAAAAAkAAAAowAAASQAAQAAAAMACgACAAAAAAACAIAEAAAAAAAEAABNAAAAAAAAABUBAgAAAAAAAAABAD4AAAAAAAAAAAACAA4APgAAAAAAAAADAFwATAAAAAAAAAAEAD4AqAAAAAAAAAAFABYA5gAAAAAAAAAGAB8A/AAAAAAAAAAIABwBGwABAAAAAAABAD4AAAABAAAAAAACAA4APgABAAAAAAADAFwATAABAAAAAAAEAD4AqAABAAAAAAAFABYA5gABAAAAAAAGAB8A/AABAAAAAAAIABwBGwADAAEECQABAD4AAAADAAEECQACAA4APgADAAEECQADAFwATAADAAEECQAEAD4AqAADAAEECQAFABYA5gADAAEECQAGAB8A/AADAAEECQAIABwBGwBSAG8AdQBuAGQAIABiAHIAYQBjAGsAZQB0AHMAIAB3AGkAdABoACAAYQBzAGMAZQBuAHQAIAAxADgANQA0AFIAZQBnAHUAbABhAHIATQBhAHQAaABzACAARgBvAHIAIABNAG8AcgBlACAAUgBvAHUAbgBkACAAYgByAGEAYwBrAGUAdABzACAAdwBpAHQAaAAgAGEAcwBjAGUAbgB0ACAAMQA4ADUANABSAG8AdQBuAGQAIABiAHIAYQBjAGsAZQB0AHMAIAB3AGkAdABoACAAYQBzAGMAZQBuAHQAIAAxADgANQA0AFYAZQByAHMAaQBvAG4AIAAyAC4AMFJvdW5kX2JyYWNrZXRzX3dpdGhfYXNjZW50XzE4NTQATQBhAHQAaABzACAARgBvAHIAIABNAG8AcgBlAAAAAAMAAAAAAAADnwHPAAAAAAAAAAAAAAAAAAAAAAAAAAC5B/8AAY2FAA==)format('truetype');font-weight:normal;font-style:normal;}</style></defs><text font-family=\"Arial\" font-size=\"16\" text-anchor=\"middle\" x=\"9.5\" y=\"27\">27</text><text font-family=\"math1fb2c67c42b223bc9410ae80418\" font-size=\"16\" text-anchor=\"middle\" x=\"22.5\" y=\"27\">&#xB7;</text><text font-family=\"math1fb2c67c42b223bc9410ae80418\" font-size=\"32\" text-anchor=\"middle\" x=\"34.5\" y=\"31\">&#x222B;</text><text font-family=\"round_brackets18549f92a457f2409\" font-size=\"16\" text-anchor=\"middle\" x=\"45.5\" y=\"27\">(</text><text font-family=\"Arial\" font-size=\"16\" font-style=\"italic\" text-anchor=\"middle\" x=\"51.5\" y=\"27\">d</text><text font-family=\"round_brackets18549f92a457f2409\" font-size=\"16\" text-anchor=\"middle\" x=\"59.5\" y=\"27\">)</text></svg>","baseline":"27","format":"svg","alt":"27 times integral left parenthesis d right parenthesis","role":"math"}}
    const mathmlHtml = doc.convert(mathml).querySelector('svg');
    const returnObj = {
      status: 'ok',
      result: {
        height: mathmlHtml.getAttribute('height').replace(/ex/g, ''),
        width: mathmlHtml.getAttribute('width').replace(/ex/g, ''),
        content: mathmlHtml.outerHTML,
        baseline: '27',
        format: 'svg',
        alt: '',
        role: 'math',
      },
    };
    return JSON.stringify(returnObj);
  }


  /**
   * Returns the server language of a certain service. The possible values
   * are: php, aspx, java and ruby.
   * This method has backward compatibility purposes.
   * @param {String} service - The configuration service.
   * @returns {String} - The server technology associated with the configuration service.
   */
  static getServerLanguageFromService(service) {
    if (service.indexOf('.php') !== -1) {
      return 'php';
    }
    if (service.indexOf('.aspx') !== -1) {
      return 'aspx';
    }
    if (service.indexOf('wirispluginengine') !== -1) {
      return 'ruby';
    }
    return 'java';
  }

  /**
   * Returns the URI associated with a certain service.
   * @param {String} service - The service name.
   * @return {String} The service path.
   */
  static createServiceURI(service) {
    const extension = ServiceProvider.serverExtension();
    return Util.concatenateUrl(ServiceProvider.parameters.URI, service) + extension;
  }

  static serverExtension() {
    if (ServiceProvider.parameters.server.indexOf('php') !== -1) {
      return '.php';
    }
    if (ServiceProvider.parameters.server.indexOf('aspx') !== -1) {
      return '.aspx';
    }
    return '';
  }
}

/**
 * @property {String} service - The service name.
 * @property {String} path - The service path.
 * @static
 */
ServiceProvider._servicePaths = {};

/**
 * The integration path. Contains the path of the configuration service.
 * Used to define the path for all services.
 * @type {String}
 * @private
 */
ServiceProvider._integrationPath = '';

/**
 * ServiceProvider static listeners.
 * @type {Listeners}
 * @private
 */
ServiceProvider._listeners = new Listeners();


/**
 * Service provider parameters.
 * @type {ServiceProviderParameters}
 */
ServiceProvider._parameters = {};
