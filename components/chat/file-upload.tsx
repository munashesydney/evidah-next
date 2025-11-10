"use client";
import React, { useState, useRef, FormEvent } from "react";
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { FilePlus2, Plus, Trash2, CircleX, X } from "lucide-react";
import useToolsStore from "@/stores/chat/useToolsStore";

interface FileUploadProps {
  vectorStoreId?: string;
  vectorStoreName?: string;
  onAddStore: (id: string) => void;
  onUnlinkStore: () => void;
}

export default function FileUpload({
  vectorStoreId,
  onAddStore,
  onUnlinkStore,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [newStoreName, setNewStoreName] = useState<string>("Default store");
  const [uploading, setUploading] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedFileTypes = [
    ".c", ".cpp", ".cs", ".css", ".doc", ".docx", ".go", ".html", ".java",
    ".js", ".json", ".md", ".pdf", ".php", ".pptx", ".py", ".rb", ".sh",
    ".tex", ".ts", ".txt"
  ];

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a file to upload.");
      return;
    }
    setUploading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64Content = arrayBufferToBase64(arrayBuffer);
      const fileObject = {
        name: file.name,
        content: base64Content,
      };

      // 1. Upload file
      const uploadResponse = await fetch("/api/chat/vector_stores/upload_file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileObject,
        }),
      });
      if (!uploadResponse.ok) {
        throw new Error("Error uploading file");
      }
      const uploadData = await uploadResponse.json();
      const fileId = uploadData.id;
      if (!fileId) {
        throw new Error("Error getting file ID");
      }
      console.log("Uploaded file:", uploadData);

      let finalVectorStoreId = vectorStoreId;

      // 2. If no vector store is linked, create one
      if (!vectorStoreId || vectorStoreId === "") {
        const createResponse = await fetch("/api/chat/vector_stores/create_store", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeName: newStoreName,
          }),
        });
        if (!createResponse.ok) {
          throw new Error("Error creating vector store");
        }
        const createData = await createResponse.json();
        finalVectorStoreId = createData.id;
      }

      if (!finalVectorStoreId) {
        throw new Error("Error getting vector store ID");
      }

      onAddStore(finalVectorStoreId);

      // 3. Add file to vector store
      const addFileResponse = await fetch("/api/chat/vector_stores/add_file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          vectorStoreId: finalVectorStoreId,
        }),
      });
      if (!addFileResponse.ok) {
        throw new Error("Error adding file to vector store");
      }
      const addFileData = await addFileResponse.json();
      console.log("Added file to vector store:", addFileData);
      setFile(null);
      setDialogOpen(false);
    } catch (error) {
      console.error("Error during file upload process:", error);
      alert("There was an error processing your file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="bg-white dark:bg-gray-800 rounded-full flex items-center justify-center py-1 px-3 border border-gray-200 dark:border-gray-700 gap-1 font-medium text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-gray-700 dark:text-gray-300"
      >
        <Plus size={16} />
        Upload
      </button>

      <Transition show={dialogOpen}>
        <Dialog onClose={() => setDialogOpen(false)} className="relative z-50">
          <TransitionChild
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          </TransitionChild>

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <TransitionChild
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Add files to your vector store
                  </h2>
                  <button
                    onClick={() => setDialogOpen(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="my-6">
                    {!vectorStoreId || vectorStoreId === "" ? (
                      <div className="flex items-start gap-2 text-sm">
                        <label className="font-medium w-72 text-gray-700 dark:text-gray-300" htmlFor="storeName">
                          New vector store name
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            A new store will be created when you upload a file.
                          </div>
                        </label>
                        <input
                          id="storeName"
                          type="text"
                          value={newStoreName}
                          onChange={(e) => setNewStoreName(e.target.value)}
                          className="border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 flex-1"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="text-sm font-medium w-24 text-nowrap text-gray-700 dark:text-gray-300">
                            Vector store
                          </div>
                          <div className="text-gray-500 dark:text-gray-400 text-xs font-mono flex-1 text-ellipsis truncate">
                            {vectorStoreId}
                          </div>
                          <button
                            type="button"
                            onClick={() => onUnlinkStore()}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <CircleX size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    className="flex justify-center items-center mb-4 h-[200px] border-2 border-dashed rounded-lg border-gray-300 dark:border-gray-600 transition-colors"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    style={{
                      backgroundColor: isDragActive ? "rgba(139, 92, 246, 0.1)" : "transparent",
                    }}
                  >
                    {file ? (
                      <div className="flex flex-col items-start">
                        <div className="text-gray-500 dark:text-gray-400">Loaded file</div>
                        <div className="flex items-center mt-2">
                          <div className="text-gray-900 dark:text-gray-100 mr-2">{file.name}</div>
                          <button
                            type="button"
                            onClick={removeFile}
                            className="text-gray-900 dark:text-gray-100 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="p-6 flex items-center justify-center relative cursor-pointer"
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept={acceptedFileTypes.join(",")}
                            onChange={(e) => {
                              const selectedFile = e.target.files?.[0];
                              if (selectedFile) {
                                handleFileSelect(selectedFile);
                              }
                            }}
                          />
                          <div className="flex flex-col items-center text-center z-10">
                            <FilePlus2 className="mb-4 size-8 text-gray-700 dark:text-gray-300" />
                            <div className="text-gray-700 dark:text-gray-300">Upload a file</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              or drag and drop
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setDialogOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploading || !file}
                      className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {uploading ? "Uploading..." : "Add"}
                    </button>
                  </div>
                </form>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}

