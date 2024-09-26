<template>
  <div>
    <q-btn-dropdown
      split
      outline
      :label="currentCompany !== null ? currentCompany.alias : 'Loading...'"
      class="ellipsis full-width"
    >
      <q-list>
        <q-item
          clickable
          v-close-popup
          dense
          v-for="(company, index) in companies"
          :disable="
            company.enabled && company.user.employee_enabled ? false : true
          "
          :key="index"
          @click="onCompanySelection(company)"
        >
          <q-item-section>
            <q-item-label lines="1"> {{ company.alias }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>
  </div>
  <q-table
    grid
    :rows="files"
    :rows-per-page-options="[50, 100, 150]"
    class="row q-col-gutter-xs full-height full-width default-table full file-explorer-table"
    dense
    :loading="isLoading"
    :row-key="columns[0].name"
    v-model:pagination="pagination"
    @request="getFiles"
    binary-state-sort
  >
    <template v-slot:item="props">
      <div
        :class="[
          'col-12 col-sm-4 col-md-2 image-wrapper q-pa-xs',
          {
            selected: selectedFile && selectedFile['@id'] === props.row['@id'],
          },
        ]"
        @click="selectFile(props.row)"
      >
        <img
          :src="getImage(props.row)"
          :alt="getLabel(props.row)"
          class="responsive-image"
        />
      </div>
    </template>
  </q-table>

  <div class="upload-bars">
    <UploadForm
      :open="open"
      :multiple="multiple"
      :accept="accept"
      @fileUploaded="fileUploaded"
    />
  </div>
  <div class="action-bar row justify-end q-pa-sm">
    <q-btn label="Salvar" color="primary" @click="chooseFile" />
  </div>
</template>
<script>
import MyCompanies from "@controleonline/ui-common/src/components/Common/MyCompanies";
import UploadForm from "@controleonline/ui-default/src/components/Default/Common/Inputs/UploadInput.vue";
import { ENTRYPOINT } from "app/config/entrypoint";
import { mapGetters, mapActions } from "vuex";

export default {
  components: {
    UploadForm,
    MyCompanies,
  },
  props: {
    data: {
      required: true,
    },
    accept: {
      required: true,
      default: () => ".jpg, .pdf, image/*",
    },
  },
  data() {
    return {
      currentCompany: {},
      files: [], // Lista de arquivos
      selectedFile: {}, // Arquivo selecionado
      pagination: { page: 1, rowsPerPage: 50 }, // Controle de paginação
      columns: [
        { name: "image", label: "Imagem", field: "image", align: "center" }, // Coluna
      ],
    };
  },
  computed: {
    ...mapGetters({
      myCompany: "people/currentCompany",
      companies: "people/companies",
    }),
    isLoading() {
      return this.$store.getters["file/isLoading"];
    },
  },
  created() {
    this.currentCompany = this.myCompany;
    this.selectFile(this.$copyObject(this.data));
    //this.getFiles();
  },
  watch: {
    currentCompany() {
      this.getFiles();
    },
  },
  methods: {
    ...mapActions({
      getItems: "file/getItems",
    }),
    onCompanySelection(company) {
      this.currentCompany = company;
    },
    selectFile(file) {
      this.selectedFile = file;
    },
    fileUploaded(file) {
      this.files = [...this.files, file];
    },
    chooseFile() {
      this.$emit("save", this.selectedFile);
    },
    getFiles() {
      this.getItems({ people: "/people/" + this.currentCompany?.id }).then(
        (data) => {
          this.files = data;
        }
      );
    },
    getImage(file) {
      return ENTRYPOINT + "/files/download/" + file["@id"].replace(/\D/g, "");
    },
    getLabel(file) {
      return "image";
    },
  },
};
</script>

<style>
.file-explorer-table {
  padding-bottom: 200px;
}

.image-wrapper.selected {
  border: 2px solid #42b983;
  padding: 2px;
}

.image-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  /* border: 1px solid #ccc;*/
}

.responsive-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.upload-bars {
  position: fixed;
  width: 400px;
  bottom: 90px;
  z-index: 999;
}
.action-bar {
  background-color: #fff;
  position: fixed;
  width: 100%;
  height: 60px;
  bottom: 30px;
  z-index: 998;
  left: 0;
}
</style>
